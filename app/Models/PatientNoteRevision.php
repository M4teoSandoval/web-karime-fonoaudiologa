<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientNoteRevision extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'patient_note_id',
        'body',
        'edited_by',
    ];

    /**
     * @return BelongsTo<PatientNote, $this>
     */
    public function note(): BelongsTo
    {
        return $this->belongsTo(PatientNote::class, 'patient_note_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'edited_by');
    }
}
