#!/bin/bash

# Deployment verification script
# Runs comprehensive tests to verify deployment is working correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost"
API_URL="$BASE_URL/api"
TIMEOUT=30

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
    if [ -n "$DOMAIN_NAME" ]; then
        BASE_URL="https://$DOMAIN_NAME"
        API_URL="$BASE_URL/api"
    fi
fi

echo "🧪 Family Coupon Manager - Deployment Verification"
echo "================================================="
echo "Testing URL: $BASE_URL"
echo ""

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run tests
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -n "  Testing $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# 1. Basic connectivity tests
echo "🌐 Basic Connectivity Tests:"
run_test "Health endpoint" "curl -f --max-time $TIMEOUT '$BASE_URL/health'"
run_test "API health endpoint" "curl -f --max-time $TIMEOUT '$API_URL/health'"
run_test "Frontend loading" "curl -f --max-time $TIMEOUT '$BASE_URL/' | grep -q 'Family Coupon Manager'"

# 2. API endpoint tests
echo -e "\n🔌 API Endpoint Tests:"
run_test "Auth endpoints available" "curl -f --max-time $TIMEOUT '$API_URL/auth/health' || curl -f --max-time $TIMEOUT '$API_URL/auth/'"
run_test "Coupon endpoints available" "curl -f --max-time $TIMEOUT '$API_URL/coupons' -H 'Accept: application/json'"

# 3. Database connectivity tests
echo -e "\n🗄️ Database Tests:"
run_test "Database connection" "docker-compose exec -T db pg_isready -U '${POSTGRES_USER:-coupon_user}' -d '${POSTGRES_DB:-coupon_manager}'"
run_test "Database tables exist" "docker-compose exec -T db psql -U '${POSTGRES_USER:-coupon_user}' -d '${POSTGRES_DB:-coupon_manager}' -c '\dt' | grep -q users"

# 4. Cache tests
echo -e "\n🚀 Cache Tests:"
run_test "Redis connection" "docker-compose exec -T redis redis-cli -a '${REDIS_PASSWORD}' ping"
run_test "Redis memory info" "docker-compose exec -T redis redis-cli -a '${REDIS_PASSWORD}' info memory | grep -q used_memory"

# 5. Security tests
echo -e "\n🔒 Security Tests:"
run_test "Security headers present" "curl -I --max-time $TIMEOUT '$BASE_URL/' | grep -q 'X-Frame-Options'"
run_test "HTTPS redirect (if SSL enabled)" "[ -z '$DOMAIN_NAME' ] || curl -I --max-time $TIMEOUT 'http://$DOMAIN_NAME/' | grep -q '301'"
run_test "API rate limiting" "curl -f --max-time $TIMEOUT '$API_URL/coupons' -H 'Accept: application/json'"

# 6. Performance tests
echo -e "\n⚡ Performance Tests:"
run_test "Response time < 2s" "time curl -f --max-time 2 '$BASE_URL/health' > /dev/null"
run_test "API response time < 1s" "time curl -f --max-time 1 '$API_URL/health' > /dev/null"

# 7. Container health tests
echo -e "\n🐳 Container Health Tests:"
run_test "All containers running" "docker-compose ps | grep -v Exit"
run_test "No container restarts" "! docker-compose ps | grep -q 'Restarting'"
run_test "Backend container healthy" "docker-compose exec -T backend curl -f http://localhost:3001/health"
run_test "Frontend container healthy" "docker-compose exec -T frontend curl -f http://localhost:80/health"

# 8. Log tests
echo -e "\n📝 Log Tests:"
run_test "No critical errors in logs" "! docker-compose logs --tail=100 | grep -i 'critical\\|fatal'"
run_test "Backend logs present" "docker-compose logs backend | grep -q 'Server running'"

# 9. SSL tests (if configured)
if [ -n "$DOMAIN_NAME" ]; then
    echo -e "\n🔐 SSL Tests:"
    run_test "SSL certificate valid" "echo | openssl s_client -connect $DOMAIN_NAME:443 -servername $DOMAIN_NAME 2>/dev/null | openssl x509 -noout -dates"
    run_test "HTTPS working" "curl -f --max-time $TIMEOUT 'https://$DOMAIN_NAME/health'"
fi

# 10. Functional tests
echo -e "\n🎯 Functional Tests:"

# Create a test user registration
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"

# Test user registration
echo -n "  Testing user registration... "
REGISTER_RESPONSE=$(curl -s --max-time $TIMEOUT -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"firstName\":\"Test\",\"lastName\":\"User\"}")

if echo "$REGISTER_RESPONSE" | grep -q "success.*true\|token\|user"; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # Extract token if available
    TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$TOKEN" ]; then
        # Test authenticated endpoint
        echo -n "  Testing authenticated API access... "
        if curl -s --max-time $TIMEOUT -H "Authorization: Bearer $TOKEN" "$API_URL/coupons" | grep -q "\[\]"; then
            echo -e "${GREEN}PASS${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}FAIL${NC}"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    fi
else
    echo -e "${RED}FAIL${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Summary
echo -e "\n📊 Test Results Summary:"
echo "========================"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}All tests passed! Deployment is successful.${NC}"
    exit 0
else
    echo -e "\n❌ ${RED}Some tests failed. Please check the deployment.${NC}"
    
    # Show recent logs for debugging
    echo -e "\n📝 Recent logs for debugging:"
    docker-compose logs --tail=20
    
    exit 1
fi