using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Data.SqlClient;
using Dapper;
using System.Data;

namespace Backend.DataAccess
{
    public class GlobalConfig
    {
        private static readonly string connectionString;

        static GlobalConfig()
        {

            connectionString = System.Configuration.ConfigurationManager.ConnectionStrings["BudgetDatabase"].ConnectionString;
        }

        public static IDbConnection GetConnection()
        {
            IDbConnection connection = new SqlConnection(connectionString);
            if (connection.State != ConnectionState.Open)
            {
                connection.Open();
            }
            return connection;
        }
    }
}
