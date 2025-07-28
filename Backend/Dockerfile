# --- build stage ---------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# restore
COPY Backend/Backend.csproj Backend/
RUN dotnet restore Backend/Backend.csproj

# publish (portable; no RID) → works for amd64 and arm64
COPY Backend/ ./Backend/
RUN dotnet publish Backend/Backend.csproj \
    -c Release -o /app/publish \
    /p:PublishTrimmed=false /p:PublishSingleFile=false /p:UseAppHost=false

# --- runtime stage (Debian) ---------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Healthcheck needs curl
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Listen on 8080 inside the container
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

# Container health = readiness (includes DB via /api/readyz)
HEALTHCHECK --interval=30s --timeout=3s --retries=3 --start-period=20s \
  CMD curl -fsS http://localhost:8080/api/readyz || exit 1

# app files + least privilege
COPY --from=build /app/publish ./
USER app

ENTRYPOINT ["dotnet","Backend.dll"]
