<?php

if (!function_exists('statusBadge')) {
    function statusBadge(string $status): string
    {
        $map = [
            'DRAFT'        => ['label' => 'Draft',       'class' => 'badge-neutral'],
            'SUBMITTED'    => ['label' => 'Submitted',   'class' => 'badge-lavender'],
            'UNDER_REVIEW' => ['label' => 'Under Review','class' => 'badge-warning'],
            'APPROVED'     => ['label' => 'Approved',    'class' => 'badge-sage'],
            'DISPENSING'   => ['label' => 'Dispatched',  'class' => 'badge-sage'],
            'FULFILLED'    => ['label' => 'Delivered',   'class' => 'badge-success'],
            'REJECTED'     => ['label' => 'Rejected',    'class' => 'badge-error'],
            'CANCELLED'    => ['label' => 'Cancelled',   'class' => 'badge-neutral'],
            'EXPIRED'      => ['label' => 'Expired',     'class' => 'badge-neutral'],
        ];

        $cfg   = $map[$status] ?? ['label' => $status, 'class' => 'badge-neutral'];
        $label = htmlspecialchars($cfg['label'], ENT_QUOTES, 'UTF-8');
        $class = htmlspecialchars($cfg['class'],  ENT_QUOTES, 'UTF-8');

        return "<span class=\"badge {$class}\">{$label}</span>";
    }
}
