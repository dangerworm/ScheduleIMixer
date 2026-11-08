using System.Text.Json;
using ScheduleI.Ui.Enums;
using ScheduleI.Ui.Extensions;
using ScheduleI.Ui.Models;

namespace ScheduleI.Ui;

public partial class Main : Form
{
    public const string IngredientsFileName = "ingredients.json";

    private readonly IngredientModel[] _ingredients;

    public Main()
    {
        InitializeComponent();

        _ingredients = LoadIngredients();
        LoadProducts();
    }

    private IngredientModel[] LoadIngredients()
    {
        var ingredientsJson = ReadFile(IngredientsFileName);
        var ingredients = JsonSerializer
            .Deserialize<IngredientsModel>(ingredientsJson)?
            .Ingredients
            .OrderBy(i => i.Name)
            .ToArray()
            ?? [];

        if (ingredientsJson is null)
        {
            throw new InvalidDataException("Cannot read ingredients file");
        }

        lstIngredients.Items.AddRange(ingredients);
        cmbIngredient1.Items.AddRange(ingredients);
        cmbIngredient2.Items.AddRange(ingredients);
        cmbIngredient3.Items.AddRange(ingredients);
        cmbIngredient4.Items.AddRange(ingredients);
        cmbIngredient5.Items.AddRange(ingredients);
        cmbIngredient6.Items.AddRange(ingredients);
        cmbIngredient7.Items.AddRange(ingredients);
        cmbIngredient8.Items.AddRange(ingredients);

        return ingredients;
    }

    private void LoadProducts()
    {
        cmbProducts.Format += (_, e) =>
        {
            if (e.ListItem is Product p)
                e.Value = p.ToDisplayName();
        };

        foreach (var product in Enum.GetValues<Product>())
        {
            cmbProducts.Items.Add(product);
        }

        cmbProducts.SelectedIndex = 0;
    }

    private string ReadFile(string fileName)
    {
        var directory = Directory.GetCurrentDirectory();
        var path = Path.Combine(directory, fileName);

        return File.ReadAllText(path);
    }

    private void lstIngredients_SelectedValueChanged(object sender, EventArgs e)
    {
        var ingredient = lstIngredients.SelectedItem as IngredientModel;
        txtDetails.Text = ingredient?.GetDetails();
    }

    private void cmbProducts_SelectedIndexChanged(object sender, EventArgs e)
    {
        var senderComboBox = sender as ComboBox;
        var product = senderComboBox?.SelectedItem as Product?;

        txtProductEffect.Text = product?.GetBaseEffect()?.ToDisplayName();
    }

    private void cmbIngredient_SelectedValueChanged(object sender, EventArgs e)
    {
        var senderComboBox = sender as ComboBox;
        var ingredient = senderComboBox?.SelectedItem as IngredientModel;
        var textBoxName = senderComboBox?.Name.Replace("cmbIngredient", "txtIngredient") + "Effect";
        var effectTextBox = Controls.Find(textBoxName, false).Single() as TextBox;

        if (effectTextBox is not null)
        {
            effectTextBox.Text = ingredient?.BaseEffect.ToDisplayName();
        }
    }
}
