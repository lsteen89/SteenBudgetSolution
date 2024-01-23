using Backend.Models;
using System.Reflection;
using System.Text;
using System.Reflection;

namespace Backend.Helpers
{
    public class LogHelper
    {
        public string CreateUserLogHelper(UserModel user)
        {
            StringBuilder createUserErrorLog = new StringBuilder();
            foreach (PropertyInfo property in user.GetType().GetProperties())
            {
                if (property.Name == "Password")
                {  continue; }
                var value = property.GetValue(user, null) ?? "NULL";
                createUserErrorLog.AppendLine($"{property.Name}: {value}");
            }
            return createUserErrorLog.ToString();
        }
    }
}
