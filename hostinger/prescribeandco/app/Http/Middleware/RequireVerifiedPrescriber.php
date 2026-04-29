<?php

namespace App\Http\Middleware;

use App\Enums\Role;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Extends RequireRole(PRESCRIBER) with additional clinical checks:
 *   1. PrescriberProfile exists
 *   2. GPhC number has been manually verified by an admin
 *   3. Indemnity insurance has not expired (if expiry date is set)
 *
 * Also attaches prescriberProfile to request attributes so controllers
 * don't need a second DB round-trip.
 */
class RequireVerifiedPrescriber
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->attributes->get('user');

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if ($user->role !== Role::PRESCRIBER) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $profile = $user->prescriberProfile;

        if (!$profile) {
            return response()->json(['message' => 'Prescriber profile not found'], 403);
        }

        if (!$profile->gphc_verified) {
            return response()->json(['message' => 'GPhC registration has not been verified. Please contact support.'], 403);
        }

        if ($profile->indemnity_expiry !== null && $profile->indemnity_expiry->isPast()) {
            return response()->json(['message' => 'Indemnity insurance has expired. Please renew before prescribing.'], 403);
        }

        $request->attributes->set('prescriber_profile', $profile);

        return $next($request);
    }
}
