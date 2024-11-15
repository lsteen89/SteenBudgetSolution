using System.Reflection;
using System.IO;

public static class BuildInfoHelper
{
    public static DateTime GetBuildDate(Assembly assembly)
    {
        var filePath = assembly.Location;
        return File.GetLastWriteTime(filePath);
    }
}