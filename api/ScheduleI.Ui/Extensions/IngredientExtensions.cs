using ScheduleI.Ui.Enums;

namespace ScheduleI.Ui.Extensions;

public static class IngredientExtensions
{
    public static string ToDisplayName(this Ingredient ingredient) => ingredient switch
    {
        Ingredient.Addy => "Adderall",
        Ingredient.EnergyDrink => "Energy Drink",
        Ingredient.FluMedicine => "Flu Medicine",
        Ingredient.HorseSemen => "Horse Semen",
        Ingredient.MegaBean => "Mega Bean",
        Ingredient.MotorOil => "Motor Oil",
        Ingredient.MouthWash => "Mouth Wash",
        _ => ingredient.ToString()
    };
}