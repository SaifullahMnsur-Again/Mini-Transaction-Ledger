# ==========================================
# OPTIMIZED .NET 10 BACKEND DOCKERFILE
# For: 1GB RAM VM (Multi-stage, minimal)
# ==========================================

# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS builder

WORKDIR /src

# Copy project files only
COPY ["Backend.csproj", "./"]

# Restore with cache mount (doesn't bloat image)
RUN --mount=type=cache,id=nuget,target=/root/.nuget/packages \
    dotnet restore "Backend.csproj"

# Copy source code
COPY . .

# Build and publish (optimized for production)
RUN --mount=type=cache,id=nuget,target=/root/.nuget/packages \
    dotnet publish "Backend.csproj" \
    -c Release \
    -o /app/publish \
    /p:UseAppHost=false \
    /p:DebugType=none \
    /p:DebugSymbols=false \
    /p:PublishReadyToRun=true

# ==========================================
# Stage 2: Runtime (minimal base image)
# ==========================================
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy only compiled binaries
COPY --from=builder /app/publish .

# Non-root user
RUN addgroup -g 1001 -S dotnet && \
    adduser -S dotnet -u 1001 -G dotnet

USER dotnet

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Runtime optimization
ENV DOTNET_TieredCompilation=1 \
    DOTNET_TieredCompilationQuickJit=1 \
    DOTNET_TieredCompilationQuickJitForLoops=1

# Entry point
ENTRYPOINT ["dotnet", "Backend.dll"]