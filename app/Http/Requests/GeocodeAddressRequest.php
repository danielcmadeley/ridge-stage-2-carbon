<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GeocodeAddressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'q' => ['required', 'string', 'min:3', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'q.required' => 'Enter a postcode or address to search.',
            'q.min' => 'Enter at least three characters to search.',
        ];
    }
}
