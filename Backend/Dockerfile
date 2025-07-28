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

# Only if you truly need curl in the container (often you don't)
# RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
#     && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .
USER app
ENTRYPOINT ["dotnet","Backend.dll"]
