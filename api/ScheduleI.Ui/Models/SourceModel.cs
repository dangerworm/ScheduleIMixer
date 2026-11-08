using System.Text.Json.Serialization;

namespace ScheduleI.Ui.Models;

public class SourceModel
{
    [JsonPropertyName("url")]
    public required string Url { get; set; }

    [JsonPropertyName("section")]
    public string? Section { get; set; }

    [JsonPropertyName("retrieved")]
    public DateTime DateRetrieved { get; set; }
}
