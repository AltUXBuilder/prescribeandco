<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'email'         => 'required|email:rfc,dns|max:254',
            // NCSC password guidance: min 10, mixed case, digit, special char
            'password'      => ['required', 'string', 'min:10',
                                'regex:/[A-Z]/', 'regex:/[a-z]/',
                                'regex:/[0-9]/', 'regex:/[^A-Za-z0-9]/'],
            'first_name'    => 'required|string|max:100',
            'last_name'     => 'required|string|max:100',
            'nhs_number'    => 'nullable|string|regex:/^\d{10}$/',
            'phone'         => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|date',
        ];
    }

    public function messages(): array
    {
        return [
            'password.regex' => 'Password must contain uppercase, lowercase, a digit, and a special character.',
        ];
    }
}
