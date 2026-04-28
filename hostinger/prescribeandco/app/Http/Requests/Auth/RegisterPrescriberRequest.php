<?php

namespace App\Http\Requests\Auth;

class RegisterPrescriberRequest extends RegisterRequest
{
    public function rules(): array
    {
        return array_merge(parent::rules(), [
            'gphc_number'    => 'required|string|regex:/^\d{7}$/',
            'specialisation' => 'nullable|string|max:200',
            'organisation'   => 'nullable|string|max:200',
        ]);
    }
}
