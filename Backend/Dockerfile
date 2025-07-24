# --- build stage ---------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

COPY Backend/*.csproj Backend/
RUN dotnet restore Backend/*.csproj --runtime linux-arm64

COPY Backend ./Backend
WORKDIR /src/Backend
RUN dotnet publish -c Release -r linux-arm64 -o /out \
    /p:PublishTrimmed=false /p:PublishSingleFile=false /p:UseAppHost=false

# --- runtime stage -------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
USER app

ENV ASPNETCORE_URLS=http://0.0.0.0:5000 \
    DOTNET_EnableDiagnostics=0

COPY --from=build /out ./
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:5000/auth/health || exit 1

ENTRYPOINT ["dotnet", "Backend.dll"]
