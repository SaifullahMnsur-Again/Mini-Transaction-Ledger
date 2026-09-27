# ==========================================
# STAGE 1: Build (SDK + Cache Mount)
# ==========================================
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS builder
WORKDIR /src

# Copy project files first for layer caching
COPY ["Backend.csproj", "./"]

# Cache mount: Persists NuGet packages across builds without writing to image layers
RUN --mount=type=cache,id=nuget,target=/root/.nuget/packages \
    dotnet restore "Backend.csproj"

COPY . .

# Publish release binary to output directory
RUN --mount=type=cache,id=nuget,target=/root/.nuget/packages \
    dotnet publish "Backend.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ==========================================
# STAGE 2: Runtime (Ultra-minimal Alpine)
# ==========================================
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS final
WORKDIR /app
EXPOSE 8080

# Copy ONLY compiled binaries from Stage 1
COPY --from=builder /app/publish .

USER $APP_UID
ENTRYPOINT ["dotnet", "Backend.dll"]