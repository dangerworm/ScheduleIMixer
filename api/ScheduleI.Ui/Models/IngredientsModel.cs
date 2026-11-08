using System.Text.Json.Serialization;

namespace ScheduleI.Ui.Models;

public class IngredientsModel
{
    [JsonPropertyName("source")]
    public required SourceModel Source { get; set; }

    [JsonPropertyName("ingredients")]
    public required IEnumerable<IngredientModel> Ingredients { get; set; }
}
