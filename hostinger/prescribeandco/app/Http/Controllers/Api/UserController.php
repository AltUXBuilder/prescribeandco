<?php

namespace App\Http\Controllers\Api;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(private UserService $users) {}

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->attributes->get('user'));
    }

    public function myProfile(Request $request): JsonResponse
    {
        $user = $this->users->findById($request->attributes->get('user')->id, withProfile: true);

        return response()->json($user->load('prescriberProfile'));
    }

    public function show(string $id): JsonResponse
    {
        return response()->json($this->users->findById($id));
    }

    public function updateRole(string $id, Request $request): JsonResponse
    {
        $request->validate(['role' => 'required|in:CUSTOMER,ADMIN,PRESCRIBER,DISPENSER']);

        $actor   = $request->attributes->get('user');
        $updated = $this->users->updateRole($id, Role::from($request->input('role')), $actor->id);

        return response()->json($updated);
    }

    public function deactivate(string $id, Request $request): JsonResponse
    {
        $actor = $request->attributes->get('user');
        $this->users->deactivate($id, $actor->id);

        return response()->json(['message' => 'User deactivated']);
    }
}
