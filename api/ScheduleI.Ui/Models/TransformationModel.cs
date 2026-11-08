using System.Text.Json.Serialization;
using ScheduleI.Ui.Enums;

namespace ScheduleI.Ui.Models;

public class TransformationModel
{
    [JsonPropertyName("from")]
    public required Effect From { get; set; }

    [JsonPropertyName("to")]
    public required Effect To { get; set; }
}
