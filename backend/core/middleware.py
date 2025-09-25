from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import time
import uuid
from typing import Callable
import json

logger = logging.getLogger(__name__)

class SecurityMiddleware(BaseHTTPMiddleware):
    """Enhanced security middleware with comprehensive protections"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate request ID for tracking
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Log request details (without sensitive data)
        start_time = time.time()
        client_ip = self._get_client_ip(request)
        
        logger.info(f"Request {request_id}: {request.method} {request.url.path} from {client_ip}")
        
        # Check for suspicious patterns
        if self._is_suspicious_request(request):
            logger.warning(f"Suspicious request detected: {request_id} from {client_ip}")
            return JSONResponse(
                status_code=400,
                content={"error": "Bad request"}
            )
        
        # Process request
        try:
            response = await call_next(request)
            
            # Add security headers
            self._add_security_headers(response)
            
            # Log response
            process_time = time.time() - start_time
            logger.info(f"Request {request_id} completed in {process_time:.3f}s with status {response.status_code}")
            
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(f"Request {request_id} failed after {process_time:.3f}s: {str(e)}")
            
            return JSONResponse(
                status_code=500,
                content={"error": "Internal server error"}
            )
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract real client IP considering proxy headers"""
        # Check X-Forwarded-For header
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Take the first IP (original client)
            return forwarded_for.split(',')[0].strip()
        
        # Check X-Real-IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        
        # Fallback to direct connection IP
        return request.client.host if request.client else "unknown"
    
    def _is_suspicious_request(self, request: Request) -> bool:
        """Detect potentially malicious requests"""
        
        # Check for SQL injection patterns
        suspicious_patterns = [
            "union select", "drop table", "delete from", "update set",
            "insert into", "'; --", "' or 1=1", "' or '1'='1",
            "<script", "javascript:", "onload=", "onerror="
        ]
        
        # Check URL path
        path_lower = request.url.path.lower()
        for pattern in suspicious_patterns:
            if pattern in path_lower:
                return True
        
        # Check query parameters
        for key, value in request.query_params.items():
            value_lower = str(value).lower()
            for pattern in suspicious_patterns:
                if pattern in value_lower:
                    return True
        
        # Check for overly long URLs (potential buffer overflow)
        if len(str(request.url)) > 2048:
            return True
        
        # Check for suspicious user agents
        user_agent = request.headers.get("user-agent", "").lower()
        suspicious_agents = ["sqlmap", "nmap", "nikto", "burp", "zap"]
        for agent in suspicious_agents:
            if agent in user_agent:
                return True
        
        return False
    
    def _add_security_headers(self, response: Response) -> None:
        """Add comprehensive security headers"""
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["X-Request-ID"] = getattr(response, 'request_id', 'unknown')
        
        # Content Security Policy
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "frame-ancestors 'none';"
        )
        response.headers["Content-Security-Policy"] = csp

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Comprehensive request logging middleware"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # Extract request information
        request_data = {
            "method": request.method,
            "url": str(request.url),
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "headers": dict(request.headers),
            "client_ip": self._get_client_ip(request),
            "user_agent": request.headers.get("user-agent", ""),
            "request_id": getattr(request.state, 'request_id', str(uuid.uuid4()))
        }
        
        # Remove sensitive headers from logging
        sensitive_headers = {"authorization", "cookie", "x-api-key"}
        for header in sensitive_headers:
            if header in request_data["headers"]:
                request_data["headers"][header] = "[REDACTED]"
        
        # Process request
        response = await call_next(request)
        
        # Calculate processing time
        process_time = time.time() - start_time
        
        # Log request/response details
        log_data = {
            **request_data,
            "status_code": response.status_code,
            "process_time_ms": round(process_time * 1000, 2),
            "response_size": response.headers.get("content-length", "unknown")
        }
        
        # Log level based on status code
        if response.status_code >= 500:
            logger.error(f"Server Error: {json.dumps(log_data)}")
        elif response.status_code >= 400:
            logger.warning(f"Client Error: {json.dumps(log_data)}")
        else:
            logger.info(f"Success: {json.dumps(log_data)}")
        
        # Add processing time header
        response.headers["X-Process-Time"] = str(process_time)
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract real client IP considering proxy headers"""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        
        return request.client.host if request.client else "unknown"

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Advanced rate limiting middleware"""
    
    def __init__(self, app, calls_per_minute: int = 60, burst_size: int = 10):
        super().__init__(app)
        self.calls_per_minute = calls_per_minute
        self.burst_size = burst_size
        self.client_requests = {}  # In production, use Redis
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = self._get_client_ip(request)
        current_time = time.time()
        
        # Initialize client tracking
        if client_ip not in self.client_requests:
            self.client_requests[client_ip] = {
                "requests": [],
                "burst_count": 0,
                "last_request": current_time
            }
        
        client_data = self.client_requests[client_ip]
        
        # Clean old requests (older than 1 minute)
        minute_ago = current_time - 60
        client_data["requests"] = [req_time for req_time in client_data["requests"] if req_time > minute_ago]
        
        # Check rate limit
        if len(client_data["requests"]) >= self.calls_per_minute:
            logger.warning(f"Rate limit exceeded for {client_ip}")
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "retry_after": 60
                },
                headers={
                    "Retry-After": "60",
                    "X-RateLimit-Limit": str(self.calls_per_minute),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(current_time + 60))
                }
            )
        
        # Add current request
        client_data["requests"].append(current_time)
        client_data["last_request"] = current_time
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        remaining = max(0, self.calls_per_minute - len(client_data["requests"]))
        response.headers["X-RateLimit-Limit"] = str(self.calls_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(current_time + 60))
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract real client IP considering proxy headers"""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        
        return request.client.host if request.client else "unknown"