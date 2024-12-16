using Backend.Domain.Entities;
using System.Reflection;
using System.Text;

namespace Backend.Infrastructure.Helpers
{
    public class LogHelper
    {
        public string CreateUserLogHelper(UserModel user)
        {
            StringBuilder createUserErrorLog = new StringBuilder();
            foreach (PropertyInfo property in user.GetType().GetProperties())
            {
                if (property.Name == "Password")
                { continue; }
                var value = property.GetValue(user, null) ?? "NULL";
                createUserErrorLog.AppendLine($"{property.Name}: {value}");
            }
            return createUserErrorLog.ToString();
        }
        public string MaskEmail(string email)
        {
            var parts = email.Split('@');
            if (parts.Length != 2) return email; 
            var localPart = parts[0].Length > 3 ? parts[0].Substring(0, 3) + "****" : parts[0];
            return $"{localPart}@{parts[1]}";
        }
    }
}
