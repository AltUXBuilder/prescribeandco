<?php

return [

    // ── Shared (men & women) — one page, #mens and #womens anchors ────────────

    'weight-loss' => [
        'slug'    => 'weight-loss',
        'name'    => 'Weight Loss',
        'icon'    => '⚖️',
        'headline'=> 'Weight Loss',
        'intro'   => 'Clinically-proven injectable and oral treatments prescribed by UK-registered prescribers. Available for men and women.',
        'genders' => ['men', 'women'],
        'mens' => [
            'title' => 'Weight Loss for Men',
            'intro' => 'Men tend to carry excess weight around the abdomen, increasing the risk of type 2 diabetes and cardiovascular disease. GLP-1 treatments like Semaglutide (Wegovy) and Tirzepatide (Mounjaro) have shown significant results for men, helping reduce appetite and improve metabolic markers. Our prescribers assess your BMI and health history before approving treatment.',
        ],
        'womens' => [
            'title' => 'Weight Loss for Women',
            'intro' => 'Hormonal changes — including those related to PCOS, perimenopause, and menopause — can make weight management more difficult for women. GLP-1 receptor agonists like Wegovy and Mounjaro are highly effective for women and are prescribed following a short online consultation with one of our UK-registered prescribers.',
        ],
    ],

    'hair-loss' => [
        'slug'    => 'hair-loss',
        'name'    => 'Hair Loss',
        'icon'    => '🧴',
        'headline'=> 'Hair Loss',
        'intro'   => 'Evidence-based topical and oral treatments for pattern hair loss, prescribed online by UK-registered prescribers.',
        'genders' => ['men', 'women'],
        'mens' => [
            'title' => 'Hair Loss in Men',
            'intro' => 'Male pattern baldness (androgenetic alopecia) affects around 50% of men by the age of 50. It is caused by sensitivity to DHT, a hormone derived from testosterone. Finasteride 1mg and Dutasteride 0.5mg block DHT production to slow and reverse hair loss. Minoxidil can be used alongside oral treatments to stimulate regrowth.',
        ],
        'womens' => [
            'title' => 'Hair Loss in Women',
            'intro' => 'Female pattern hair loss is more common than many realise and often relates to hormonal changes, nutritional deficiencies, or conditions such as PCOS. Minoxidil topical solution is the most widely recommended treatment for women. Our prescribers can assess your history and recommend a personalised plan.',
        ],
    ],

    // ── Men only ──────────────────────────────────────────────────────────────

    'erectile-dysfunction' => [
        'slug'    => 'erectile-dysfunction',
        'name'    => 'Erectile Dysfunction',
        'icon'    => '💊',
        'headline'=> 'Erectile Dysfunction',
        'intro'   => 'Discreet, effective ED treatment prescribed online by UK-registered prescribers. Choose from on-demand or daily options — delivered in plain, unmarked packaging.',
        'genders' => ['men'],
    ],

    // ── Women only ────────────────────────────────────────────────────────────

    'skin-health' => [
        'slug'    => 'skin-health',
        'name'    => 'Skin Health',
        'icon'    => '✨',
        'headline'=> 'Skin Health',
        'intro'   => 'Prescription-strength treatments for acne, rosacea, dark spots, and skin ageing — prescribed after a short online consultation. Includes Tretinoin, Azelaic Acid, and Clindamycin.',
        'genders' => ['women'],
    ],

    'digestive-health' => [
        'slug'    => 'digestive-health',
        'name'    => 'Digestive Health',
        'icon'    => '🌿',
        'headline'=> 'Digestive Health',
        'intro'   => 'Prescription treatments for IBS, acid reflux, bloating, and other digestive conditions — reviewed and prescribed by UK-registered prescribers after a short consultation.',
        'genders' => ['women'],
    ],

];
