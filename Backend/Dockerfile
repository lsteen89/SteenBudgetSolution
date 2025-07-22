# Stage 1: The Build Environment
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["Backend.csproj", "."]
RUN dotnet restore "./Backend.csproj"
COPY . .
RUN dotnet publish "Backend.csproj" -c Release -o /app/publish

# Stage 2: The Production Environment
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Backend.dll"]