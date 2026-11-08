using ScheduleI.Ui.Enums;

namespace ScheduleI.Ui.Extensions;

public static class ProductExtensions
{
    public static string ToDisplayName(this Product product) => product switch
    {
        Product.OGKush => "OG Kush",
        Product.SourDiesel => "Sour Diesel",
        Product.GreenCrack => "Green Crack",
        Product.GranddaddyPurple => "Granddaddy Purple",
        _ => product.ToString()
    };

    public static Effect? GetBaseEffect(this Product product) => product switch
    {
        Product.OGKush => Effect.Calming,
        Product.SourDiesel => Effect.Refreshing,
        Product.GreenCrack => Effect.Energizing,
        Product.GranddaddyPurple => Effect.Sedating,
        _ => null
    };
}