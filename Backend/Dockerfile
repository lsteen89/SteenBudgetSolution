# --- build stage (Debian) ---
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY SteenBudgetSolution.sln .
COPY Backend/ ./Backend/
RUN dotnet restore Backend/Backend.csproj

# build + publish (no extra restore)
RUN dotnet build    Backend/Backend.csproj -c Release -o /app/build --no-restore
RUN dotnet publish  Backend/Backend.csproj -c Release -o /app/publish \
    --no-restore /p:PublishTrimmed=false /p:PublishSingleFile=false /p:UseAppHost=false

# --- runtime stage (Debian) ---
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

# add curl for healthcheck (run while still root)
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# adjust 8080 if your app listens on another port
HEALTHCHECK --interval=15s --timeout=3s --start-period=25s --retries=5 \
  CMD curl -fsS http://127.0.0.1:8080/api/healthz || exit 1

USER app
ENTRYPOINT ["dotnet","Backend.dll"]
