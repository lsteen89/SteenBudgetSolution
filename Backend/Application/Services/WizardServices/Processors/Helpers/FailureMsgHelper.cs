﻿namespace Backend.Application.Services.WizardServices.Processors.Helpers
{
    public class FailureMsgHelper
    {
        public static string GetFailureMessage(string processorName)
        {
            return $"An error occurred in the '{processorName}'. Please try again later or contact support if the issue persists.";
        }
    }
}
