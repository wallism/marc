using System;
using System.Threading.Tasks;
using System.Windows;

namespace Shop.Admin.Desktop;

public partial class ExportView : Window
{
    private readonly ILegacyExportStore _store;

    public ExportView(ILegacyExportStore store)
    {
        _store = store;
        InitializeComponent();
    }

    private async void OnExportClick(object sender, RoutedEventArgs e)
    {
        ExportButton.IsEnabled = false;
        try
        {
            var path = await Task.Run(() => _store.Export());
            StatusText.Text = $"Exported to {path}";
        }
        catch (Exception ex)
        {
            StatusText.Text = $"Export failed: {ex.Message}";
        }
        finally
        {
            ExportButton.IsEnabled = true;
        }
    }
}
