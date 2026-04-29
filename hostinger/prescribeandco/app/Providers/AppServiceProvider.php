<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(\App\Services\JwtService::class);
        $this->app->singleton(\App\Services\AuditService::class);
        $this->app->singleton(\App\Services\StorageService::class);
        $this->app->singleton(\App\Services\StripePaymentProvider::class);
        $this->app->singleton(\App\Services\QuestionnaireValidator::class);
        $this->app->singleton(\App\Services\EligibilityCalculator::class);
        $this->app->singleton(\App\Services\PrescriptionStateMachine::class);
    }

    public function boot(): void
    {
        //
    }
}
