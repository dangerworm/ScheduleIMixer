using System.Text.Json.Serialization;
using ScheduleI.Ui.Enums;

namespace ScheduleI.Ui.Models;

public class RecipeModel
{
    [JsonPropertyName("baseProduct")]
    public required Product BaseProduct { get; set; }
    
    [JsonPropertyName("mixSteps")]
    public required int MixSteps { get; set; }

    [JsonPropertyName("ingredients")]
    public required IEnumerable<Ingredient> Ingredients { get; set; }
    
    [JsonPropertyName("ingredientCost")]
    public required int IngredientCost { get; set; }
    
    [JsonPropertyName("askingPrice")]
    public required int AskingPrice { get; set; }
    
    [JsonPropertyName("profit")]
    public required int Profit { get; set; }
    
    [JsonPropertyName("multiplier")]
    public required float Multiplier { get; set; }
    
    [JsonPropertyName("effects")]
    public required IEnumerable<Effect> Effects { get; set; }
    
    public int ProfitCalculated => AskingPrice - Profit;
}
