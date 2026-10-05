"""Polite HTTP: max 1 request/second per host, timeouts on every call, project User-Agent."""
from __future__ import annotations

import threading
import time
import socket
import ipaddress
from urllib.parse import urlparse

import httpx

from crux_lab.config import settings

_last: dict[str, float] = {}
_locks: dict[str, threading.Lock] = {}
_glock = threading.Lock()
MIN_INTERVAL = 1.05

def public_url(url: str):
    p = urlparse(url)
    if p.scheme not in ("http", "https") or not p.hostname or p.username or p.password:
        raise ValueError("Source URL must be public HTTP(S)")
    addresses = socket.getaddrinfo(p.hostname, p.port or (443 if p.scheme == "https" else 80))
    if any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):
        raise ValueError("Source URL resolves to a private or local address")


def _host_lock(host: str) -> threading.Lock:
    with _glock:
        return _locks.setdefault(host, threading.Lock())


def _fetch(url: str, params: dict | None, headers: dict, timeout: float, deadline: float | None,
           max_bytes: int | None) -> httpx.Response:
    """One GET with an optional wall-clock deadline and size cap. httpx timeouts apply per read, so a
    server that trickles bytes could otherwise hold a download (and the whole job) indefinitely."""
    if deadline is None and max_bytes is None:
        return httpx.get(url, params=params, headers=headers, timeout=timeout, follow_redirects=False)
    with httpx.stream("GET", url, params=params, headers=headers, timeout=httpx.Timeout(timeout, read=30),
                      follow_redirects=False) as r:
        body = bytearray()
        if not r.is_redirect:
            for chunk in r.iter_bytes():
                body += chunk
                if max_bytes and len(body) > max_bytes:
                    raise httpx.ReadError(f"response exceeds {max_bytes} bytes", request=r.request)
                if deadline and time.monotonic() > deadline:
                    raise httpx.ReadTimeout("download exceeded its total time limit", request=r.request)
        return httpx.Response(r.status_code, headers=r.headers, content=bytes(body), request=r.request)


def get(url: str, *, params: dict | None = None, timeout: float = 60, retries: int = 3,
        accept: str | None = None, total: float | None = None, max_bytes: int | None = None) -> httpx.Response:
    host = urlparse(url).netloc
    public_url(url)
    headers = {"User-Agent": settings.user_agent}
    if accept:
        headers["Accept"] = accept
    last_exc: Exception | None = None
    for attempt in range(retries):
        with _host_lock(host):
            wait = _last.get(host, 0) + MIN_INTERVAL - time.monotonic()
            if wait > 0:
                time.sleep(wait)
            deadline = time.monotonic() + total if total else None
            try:
                r = _fetch(url, params, headers, timeout, deadline, max_bytes)
                for _ in range(5):
                    if not r.is_redirect:
                        break
                    from urllib.parse import urljoin
                    redirect = urljoin(str(r.url), r.headers["location"])
                    public_url(redirect)
                    r = _fetch(redirect, None, headers, timeout, deadline, max_bytes)
                if r.is_redirect:
                    raise ValueError("Source redirected too many times")
            except httpx.HTTPError as e:
                last_exc = e
                r = None
            finally:
                _last[host] = time.monotonic()
        if r is not None and r.status_code < 400:
            return r
        if r is not None and r.status_code not in (429, 500, 502, 503, 504):
            r.raise_for_status()
        time.sleep(2 * (attempt + 1) + (5 if r is not None and r.status_code == 429 else 0))
    if last_exc:
        raise last_exc
    r.raise_for_status()  # type: ignore[union-attr]
    return r  # type: ignore[return-value]
