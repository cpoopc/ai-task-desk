# Checklist

## API Design

- [ ] Define resource model and relationships
- [ ] Design RESTful endpoints with proper naming conventions
- [ ] Define request/response JSON schemas
- [ ] Document query parameters and pagination
- [ ] Specify sorting and filtering options

## Auth & Security

- [ ] Choose authentication method (JWT, API key, OAuth)
- [ ] Implement input validation and sanitization
- [ ] Add rate limiting per client/user
- [ ] Configure CORS policy for allowed origins
- [ ] Audit dependencies for known vulnerabilities

## Implementation

- [ ] Set up project structure with proper layering
- [ ] Implement request/response DTOs with validation
- [ ] Create service layer with business logic
- [ ] Add database queries with proper indexing
- [ ] Implement error handling with appropriate HTTP codes

## Testing

- [ ] Write unit tests for service layer (>80% coverage)
- [ ] Add integration tests for API endpoints
- [ ] Test edge cases (empty inputs, boundary values)
- [ ] Verify error scenarios return proper responses

## Observability

- [ ] Add structured logging with context
- [ ] Create metrics for request count, latency, errors
- [ ] Set up distributed tracing span
- [ ] Configure health check endpoint
- [ ] Document SLO targets and error budgets
