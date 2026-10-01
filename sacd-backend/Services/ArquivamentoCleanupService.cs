using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace sacd_backend.Services
{
    public class ArquivamentoCleanupService : BackgroundService
    {
        private readonly IServiceProvider _services;
        private readonly ILogger<ArquivamentoCleanupService> _logger;
        private static readonly TimeSpan Intervalo = TimeSpan.FromHours(24);

        public ArquivamentoCleanupService(IServiceProvider services, ILogger<ArquivamentoCleanupService> logger)
        {
            _services = services;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Serviço de limpeza de arquivamentos iniciado.");

            while (!stoppingToken.IsCancellationRequested)
            {
                await LimparAsync();
                await Task.Delay(Intervalo, stoppingToken);
            }
        }

        private async Task LimparAsync()
        {
            try
            {
                using var scope = _services.CreateScope();
                var service = scope.ServiceProvider.GetRequiredService<IDenunciaService>();
                await service.LimparArquivadasAntigasAsync();
                _logger.LogInformation("Limpeza de denúncias arquivadas concluída.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro durante a limpeza de denúncias arquivadas.");
            }
        }
    }
}
