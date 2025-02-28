﻿using Backend.Application.DTO;
using Backend.Domain.Entities.Auth;

namespace Backend.Application.Interfaces.UserServices
{
    public interface IUserTokenService
    {
        Task<UserTokenModel> CreateEmailTokenAsync(Guid persoid);
        Task<bool> InsertUserTokenAsync(UserTokenModel tokenModel);
        Task<UserTokenModel?> GetTokenByGuidAsync(Guid token);
        Task<bool> DeleteTokenByPersoidAsync(Guid persoid);
        Task<UserVerificationTrackingModel> GetUserVerificationTrackingAsync(Guid persoId);
        Task InsertUserVerificationTrackingAsync(UserVerificationTrackingModel tracking);
        Task<UserTokenModel?> GetUserVerificationTokenByPersoIdAsync(Guid persoid);
        Task<int> DeleteUserTokenByPersoidAsync(Guid persoid);
        Task UpdateUserVerificationTrackingAsync(UserVerificationTrackingModel tracking);
        Task SaveResetTokenAsync(Guid persoId, Guid token);
        Task<bool> ValidateResetTokenAsync(Guid token);
    }
}
