# Stage 1: The Build Environment
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy the solution file (optional but can be helpful)
COPY SteenBudgetSolution.sln .

# Copy the ENTIRE Backend project folder
COPY Backend/ ./Backend/

# Restore dependencies ONLY for the main Backend project, not the whole solution
# This ensures that we only restore what is necessary for the Backend project
RUN dotnet restore "Backend/Backend.csproj"

# Publish the backend project
WORKDIR "/src/Backend"
RUN dotnet publish "Backend.csproj" -c Release -o /app/publish

# Stage 2: The Production Environment
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
#ENTRYPOINT ["dotnet", "Backend.dll"]
ENTRYPOINT ["dotnet", "Backend.dll"]