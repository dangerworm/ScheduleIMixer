using System.Text.Json.Serialization;

namespace ScheduleI.Ui.Models;

public class MaxProfitStrategiesModel
{
    [JsonPropertyName("source")]
    public required SourceModel Source { get; set; }

    [JsonPropertyName("recipes")]
    public required IEnumerable<RecipeModel> Recipes{ get; set; }
}

