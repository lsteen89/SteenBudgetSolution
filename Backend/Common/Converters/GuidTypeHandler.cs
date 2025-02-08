using Dapper;
using System;
using System.Data;

namespace Backend.Common.Converters
{
    public class GuidTypeHandler : SqlMapper.TypeHandler<Guid>
    {
        // This method sets the value of the parameter when you're sending data to the database
        public override void SetValue(IDbDataParameter parameter, Guid value)
        {
            // Convert the GUID to a string (since CHAR(36) is a string in the database)
            parameter.Value = value.ToString();
        }

        // This method parses the value from the database (CHAR(36)) to a GUID when retrieving data
        public override Guid Parse(object value)
        {
            if (value == null || string.IsNullOrEmpty(value.ToString()))
            {
                throw new ArgumentNullException(nameof(value), "Value cannot be null or empty when parsing to Guid.");
            }

            // Convert the CHAR(36) string from the database to a Guid
            return Guid.Parse(value.ToString()!);
        }
    }
}
