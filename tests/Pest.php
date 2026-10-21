<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind a different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

function something()
{
    // ..
}

/**
 * Devuelve el siguiente día hábil (lunes a viernes) a partir de hoy con la
 * hora indicada, en formato "Y-m-d H:i:s".
 *
 * Permite que las pruebas de agenda no dependan de una fecha fija que, con el
 * paso del tiempo, quedaría en el pasado y haría fallar la disponibilidad.
 */
function nextWeekday(string $time = '09:00:00'): string
{
    $date = now()->addDay();

    while ($date->isWeekend()) {
        $date = $date->addDay();
    }

    return $date->format('Y-m-d').' '.$time;
}

/**
 * Fecha (Y-m-d) del siguiente día hábil a partir de hoy.
 */
function nextWeekdayDate(): string
{
    return Carbon::parse(nextWeekday())->toDateString();
}
