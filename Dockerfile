# ==============================================================================
# STAGE 1: Frontend Build (Node.js 20 Alpine)
# ==============================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --prefer-offline --no-audit

COPY frontend/ ./
RUN npm run build

# ==============================================================================
# STAGE 2: Backend Maven Build (Eclipse Temurin JDK 21 Alpine)
# ==============================================================================
FROM maven:3.9-eclipse-temurin-21-alpine AS backend-builder
WORKDIR /app/backend

# Cache Maven dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy Java source code
COPY src ./src

# Copy built frontend assets directly into Spring Boot static resources directory
COPY --from=frontend-builder /app/src/main/resources/static ./src/main/resources/static

# Package executable Spring Boot fat JAR
RUN mvn clean package -DskipTests -B

# ==============================================================================
# STAGE 3: Production Runtime (Eclipse Temurin JRE 21 Alpine)
# ==============================================================================
FROM eclipse-temurin:21-jre-alpine AS runner

# Create non-privileged service user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Install curl for container health check
RUN apk add --no-cache curl

# Copy fat JAR from build stage
COPY --from=backend-builder /app/backend/target/erp-kafka-platform-1.0.0.jar app.jar

RUN chown -R appuser:appgroup /app
USER appuser

# Expose Spring Boot unified port
EXPOSE 8080

# Production JVM Ergonomics & Container Memory Controls
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:InitialRAMPercentage=40.0 -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"

# Built-in Docker Health Check
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
