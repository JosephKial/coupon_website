# Security Documentation - Family Coupon Manager

This document outlines the comprehensive security measures implemented in the Family Coupon Manager application to protect family data and ensure safe operation.

## 🔐 Security Architecture

### Defense in Depth
The application implements multiple layers of security:

1. **Infrastructure Layer**: Containerization, network isolation, firewalls
2. **Transport Layer**: HTTPS/TLS encryption, HSTS headers
3. **Application Layer**: Authentication, authorization, input validation
4. **Data Layer**: Encrypted storage, secure password hashing
5. **Monitoring Layer**: Logging, rate limiting, intrusion detection

## 🛡️ Authentication & Authorization

### Password Security
- **Hashing Algorithm**: Argon2id (OWASP recommended)
- **Parameters**: 
  - Time cost: 3 iterations
  - Memory cost: 64MB (65536 KB)
  - Parallelism: 1 thread
  - Hash length: 32 bytes
  - Salt length: 16 bytes

```python
# Argon2id configuration
ph = PasswordHasher(
    time_cost=3,           # Number of iterations
    memory_cost=65536,     # Memory usage in KB (64 MB)
    parallelism=1,         # Number of parallel threads
    hash_len=32,           # Length of hash in bytes
    salt_len=16,           # Length of salt in bytes
    type=argon2.Type.ID    # Use Argon2id variant
)
```

### Password Requirements
- Minimum 8 characters, maximum 128 characters
- Must contain:
  - At least one lowercase letter
  - At least one uppercase letter
  - At least one digit
  - At least one special character
- Cannot be common weak passwords
- Automatic rehashing when security parameters are updated

### Session Management
- **JWT Tokens**: HS256 algorithm with secure secret key
- **Access Tokens**: 30-minute expiration
- **Refresh Tokens**: 7-day expiration, stored in database
- **Token Rotation**: New refresh token issued on use
- **Automatic Logout**: On token expiration or revocation

### Multi-User Access Control
- **User Isolation**: Users can only access their own coupons
- **Admin Privileges**: Separate admin role for user management
- **Role-Based Access**: Enforced at API and database level

## 🌐 Network Security

### HTTPS Enforcement
- **SSL/TLS**: Automatic certificate management with Let's Encrypt
- **HSTS**: HTTP Strict Transport Security headers
- **Certificate Transparency**: Public certificate logs
- **Modern Protocols**: TLS 1.2+ only, secure cipher suites

### Security Headers
```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
```

### Rate Limiting
- **API Endpoints**: 60 requests/minute per IP
- **Authentication**: 10 login attempts/minute per IP
- **Registration**: 5 registrations/minute per IP
- **Burst Handling**: Configurable burst limits
- **Redis Backend**: Distributed rate limiting

## 🔍 Input Validation & Sanitization

### Server-Side Validation
- **Pydantic Models**: Schema validation for all API inputs
- **SQL Injection Prevention**: Parameterized queries via SQLAlchemy
- **XSS Prevention**: Input sanitization and output encoding
- **File Upload Security**: Type validation and size limits
- **URL Validation**: Proper URL parsing and validation

### Client-Side Validation
- **React Hook Form**: Form validation with Yup schemas
- **Input Sanitization**: HTML encoding of user inputs
- **CSP Protection**: Content Security Policy prevents code injection

### Suspicious Request Detection
```python
suspicious_patterns = [
    "union select", "drop table", "delete from", "update set",
    "insert into", "'; --", "' or 1=1", "' or '1'='1",
    "<script", "javascript:", "onload=", "onerror="
]
```

## 🗄️ Data Security

### Database Security
- **Connection Encryption**: SSL/TLS connections to PostgreSQL
- **User Isolation**: Database-level user separation
- **Prepared Statements**: Parameterized queries prevent SQL injection
- **Minimal Privileges**: Database user has only necessary permissions
- **Regular Backups**: Automated encrypted backups

### Data Encryption
- **In Transit**: All data encrypted via HTTPS/TLS
- **At Rest**: Database encryption available (configure as needed)
- **Session Data**: Encrypted storage in Redis
- **Passwords**: Irreversibly hashed (never stored in plaintext)

### Privacy Protection
- **Data Minimization**: Only necessary data collected
- **User Control**: Users can delete their own accounts
- **Access Logs**: Comprehensive logging without sensitive data
- **Family Privacy**: Multi-tenant isolation ensures family data privacy

## 🔒 Container Security

### Docker Security
- **Non-Root User**: All containers run as non-privileged users
- **Read-Only Filesystem**: Application containers use read-only root
- **Security Options**: `no-new-privileges` flag enabled
- **Minimal Images**: Alpine-based images with minimal attack surface
- **Health Checks**: Automated container health monitoring

### Network Isolation
```yaml
networks:
  coupon_network:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.20.0.0/16
```

### Resource Limits
- **Memory Limits**: Prevent container memory exhaustion
- **CPU Limits**: Fair resource allocation
- **Security Contexts**: Restricted container capabilities

## 🚨 Monitoring & Logging

### Security Logging
- **Authentication Events**: Login attempts, failures, successes
- **Authorization Events**: Access attempts to protected resources
- **Suspicious Activity**: Malicious request patterns detected
- **Rate Limiting**: Blocked requests and threshold violations
- **System Events**: Container restarts, health check failures

### Log Format
```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "level": "WARNING",
  "event": "failed_login",
  "client_ip": "192.168.1.100",
  "user_email": "user@example.com",
  "request_id": "uuid-string",
  "message": "Authentication failed"
}
```

### Alerting
- **Failed Login Attempts**: Multiple failures trigger alerts
- **Rate Limit Violations**: Excessive requests logged
- **System Health**: Container health failures monitored
- **SSL Certificate Expiry**: Automated renewal monitoring

## 🔧 Security Configuration

### Environment Variables
```env
# Strong passwords (examples)
DB_PASSWORD=SecureDBPass2024!@#$
REDIS_PASSWORD=SecureRedisPass2024!@#$

# JWT secret (minimum 32 characters)
SECRET_KEY=your-super-secret-jwt-key-at-least-32-characters-long

# Security settings
ENVIRONMENT=production
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ORIGINS=https://yourdomain.com
```

### Firewall Configuration
```bash
# UFW firewall rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP (redirects to HTTPS)
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### Fail2Ban Protection
```ini
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
```

## 🔍 Vulnerability Management

### Dependency Scanning
- **Backend**: Regular Python package updates
- **Frontend**: Regular Node.js package updates
- **Containers**: Automated base image updates
- **Security Advisories**: Monitor CVE databases

### Update Strategy
```bash
# Monthly security updates
docker-compose pull
docker-compose up -d --build

# System updates
sudo apt update && sudo apt upgrade -y

# Clean old images
docker image prune -f
```

### Penetration Testing
Regular security testing should include:
- **Authentication Bypass**: Test authentication mechanisms
- **Authorization Flaws**: Test access controls
- **Input Validation**: Test for injection vulnerabilities
- **Session Management**: Test token handling
- **Configuration Issues**: Test deployment security

## 🛡️ Incident Response

### Security Incident Types
1. **Authentication Breach**: Compromised user accounts
2. **Data Exposure**: Unauthorized data access
3. **Service Disruption**: DoS/DDoS attacks
4. **Malware**: Container compromise
5. **Configuration Errors**: Security misconfigurations

### Response Procedure
1. **Detection**: Monitor logs and alerts
2. **Assessment**: Determine scope and impact
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove threats and vulnerabilities
5. **Recovery**: Restore normal operations
6. **Documentation**: Record incident details

### Emergency Contacts
- **System Administrator**: Immediate response
- **Security Team**: Vulnerability assessment
- **Users**: Communication about incidents

## 📋 Security Checklist

### Deployment Security
- [ ] Strong passwords for all services
- [ ] JWT secret key properly randomized
- [ ] HTTPS enabled with valid certificates
- [ ] Firewall configured and enabled
- [ ] Fail2Ban configured for intrusion prevention
- [ ] All containers running as non-root
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Logging and monitoring configured

### Operational Security
- [ ] Regular security updates applied
- [ ] Backup strategy implemented
- [ ] Access logs reviewed regularly
- [ ] Failed login attempts monitored
- [ ] SSL certificate renewal automated
- [ ] Resource usage monitored
- [ ] Incident response plan documented

### Application Security
- [ ] Input validation implemented
- [ ] Output encoding used
- [ ] SQL injection protection verified
- [ ] XSS protection implemented
- [ ] CSRF protection enabled
- [ ] Authentication working correctly
- [ ] Authorization properly enforced
- [ ] Session management secure

## 🔐 Security Best Practices

### For Administrators
1. **Keep Systems Updated**: Regular security patches
2. **Monitor Logs**: Review security events daily
3. **Strong Authentication**: Use strong passwords and 2FA
4. **Regular Backups**: Test restore procedures
5. **Access Control**: Limit administrative access
6. **Network Security**: Use VPNs for remote access

### For Users
1. **Strong Passwords**: Use unique, complex passwords
2. **Logout After Use**: Don't leave sessions open
3. **Secure Networks**: Avoid public Wi-Fi for sensitive operations
4. **Report Issues**: Notify administrators of suspicious activity
5. **Regular Reviews**: Check coupon data for unauthorized changes

### For Developers
1. **Security Training**: Stay updated on security practices
2. **Code Reviews**: Security-focused code reviews
3. **Testing**: Include security tests in development
4. **Dependencies**: Keep dependencies updated
5. **Documentation**: Maintain security documentation

## 📞 Security Support

### Reporting Security Issues
- **Critical Issues**: Immediate notification to administrators
- **Non-Critical Issues**: Create issue ticket with details
- **Vulnerability Reports**: Responsible disclosure process

### Security Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [React Security](https://reactjs.org/docs/dom-elements.html#security)
- [Docker Security](https://docs.docker.com/engine/security/)

---

**Remember**: Security is an ongoing process, not a one-time setup. Regular reviews and updates are essential for maintaining a secure family coupon management system.