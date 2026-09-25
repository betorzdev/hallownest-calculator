/* js/i18n.js — Hollow: the interface language (Spanish and English).
   Three pieces:
     t(key, vars)    interface strings; {x} is replaced by vars.x
     pick(v)         resolves any { es, en } from the data or the engine
     nf(decimals)    number formatter with the active locale
   The language lives in HK.i18n.lang; setLang() changes it and updates <html lang>.
   The game data (charms, nails, spells) carries its own { es, en } in js/data.js:
   only the texts the site writes are here. */
(() => {
  'use strict';
  const HK = globalThis.HK || (globalThis.HK = {});

  const UI = {
    /* Header */
    title:          { es: 'Calculadora de Hallownest', en: 'Hallownest Calculator' },
    goHome:         { es: 'Ir a Amuletos, la pantalla de inicio', en: 'Go to Charms, the home screen' },
    langGroup:      { es: 'Idioma', en: 'Language' },
    // The tab and search-result title: carries the game's name and what the site is.
    docTitle:       { es: 'Calculadora de Hallownest para amuletos y estadísticas de Hollow Knight',
                      en: 'Hallownest Calculator for Hollow Knight charms and stats' },
    metaDescription:{ es: 'Cómo cambian las estadísticas del Caballero de Hollow Knight con cada amuleto y cada mejora: daño del aguijón, DPS, hechizos, máscaras y alma, un simulador de combate contra cada jefe y el Hogar de Dioses, y el Diario del Cazador.',
                      en: 'How the Knight\'s stats in Hollow Knight change with every charm and every upgrade: nail damage, DPS, spells, masks and soul, a combat simulator against every boss and Godhome, and the Hunter\'s Journal.' },
    presetBase:     { es: 'Caballero base', en: 'Base Knight' },
    presetBaseHint: { es: 'Como al empezar la partida: Aguijón antiguo, 5 máscaras, 3 muescas, ningún amuleto conseguido, sin capa ni Aguijón Onírico',
                      en: 'As at the start of the game: Old Nail, 5 masks, 3 notches, no charms found, no cloak and no Dream Nail' },
    presetMax:      { es: 'Todo al máximo', en: 'Everything maxed' },
    presetMaxHint:  { es: 'Todas las mejoras permanentes al máximo y todos los amuletos conseguidos; conserva los que llevas', en: 'Every permanent upgrade maxed and every charm found; keeps the ones you wear' },
    share:          { es: 'Compartir', en: 'Share' },
    shareHint:      { es: 'Copia un enlace con esta build', en: 'Copy a link to this build' },

    /* Footer: the fan-project notice, the sources and the author (docs/guide.md, "Credits and licences",
       "Contact") */
    footLabel:      { es: 'Aviso, fuentes y contacto', en: 'Notice, sources and contact' },
    footFan:        { es: 'Proyecto de fans no oficial, gratuito y sin ánimo de lucro, sin relación con {tc}. Hollow Knight y su arte son © Team Cherry.',
                      en: 'Unofficial fan project, free and non-commercial, not affiliated with {tc}. Hollow Knight and its artwork are © Team Cherry.' },
    footData:       { es: 'Datos de {wiki} y de la {wikiEs}, bajo {lic}.',
                      en: 'Data from {wiki} and the {wikiEs}, under {lic}.' },
    footWikiEs:     { es: 'wiki en español', en: 'Spanish wiki' },
    footMade:       { es: 'Hecho por Albert. ¿Un número mal, una traducción rara o un fallo? Escribe a {mail}.',
                      en: 'Made by Albert. A wrong number, an odd translation or a bug? Write to {mail}.' },

    /* The screen bar: the pages of the game's pause menu, and the Journal */
    navLabel:       { es: 'Pantallas', en: 'Screens' },
    navCharms:      { es: 'Amuletos', en: 'Charms' },          // PANE_CHARMS
    navGame:        { es: 'Tu partida', en: 'Your game' },
    navFight:       { es: 'Combate', en: 'Combat' },
    navJournal:     { es: 'Diario', en: 'Journal' },           // PANE_JOURNAL
    presetsLbl:     { es: 'Empezar desde', en: 'Start from' },

    /* Sheet panel */
    heroLabel:      { es: 'Daño del aguijón', en: 'Nail damage' },
    dps:            { es: 'Daño por segundo', en: 'Damage per second' },
    dpsShort:       { es: 'DPS', en: 'DPS' },
    range:          { es: 'Alcance', en: 'Range' },
    bestHit:        { es: 'Golpe más fuerte', en: 'Strongest attack' },
    hitsToDie:      { es: 'Golpes hasta morir', en: 'Hits until you die' },
    soulPerHit:     { es: 'Alma por golpe', en: 'Soul per hit' },
    healing:        { es: 'Curación', en: 'Healing' },
    health:         { es: 'Salud', en: 'Health' },
    soul:           { es: 'Alma', en: 'Soul' },
    notches:        { es: 'Muescas', en: 'Notches' },          // CHARM_TXT_NOTCHES
    equipped:       { es: 'Equipado', en: 'Equipped' },        // CHARM_TXT_EQUIPPED
    spells:         { es: 'Hechizos', en: 'Spells' },
    arts:           { es: 'Artes del aguijón', en: 'Nail Arts' },
    goTo:           { es: 'Ir a {label}', en: 'Go to {label}' },

    hitNoBonus:     { es: 'Aguijón sin bonos de daño', en: 'Nail with no damage bonuses' },
    hitStrength:    { es: 'Con {charm}', en: 'With {charm}' },
    hitFury:        { es: 'Furia de los caídos ardiendo', en: 'Fury of the Fallen burning' },
    hitElegy:       { es: '{nail} de aguijón más {beam} del rayo de la Elegía', en: '{nail} from the nail plus {beam} from the Elegy beam' },
    apsNote:        { es: '{aps} golpes por segundo', en: '{aps} hits per second' },
    rangeBase:      { es: 'Alcance base', en: 'Base range' },
    noBurstYet:     { es: 'Sin artes ni hechizos', en: 'No Nail Arts or spells' },
    twoMaskHits:    { es: '{n} si te pegan 2 máscaras', en: '{n} if they hit for 2 masks' },
    hitsToHeal:     { es: '{n} golpes para curar', en: '{n} hits to heal' },
    notLearned:     { es: 'Sin aprender', en: 'Not learned' },
    /* Heads a stepper's preview: it says that what follows you don't have yet.
       The lines describing what you ALREADY have go without a heading. */
    ifOneMore:      { es: 'Si subes uno', en: 'With one more' },
    pieceOf:        { es: '{what}: {n} de {max}', en: '{what}: {n} of {max}' },
    notchesTrimmed: { es: 'Con {n} muescas no te caben: te quitas {charms}', en: 'With {n} notches they no longer fit: {charms} taken off' },
    notchesTrimmedOne: { es: 'Con {n} muescas no te cabe: te quitas {charms}', en: 'With {n} notches it no longer fits: {charms} taken off' },
    soulCost:       { es: '{n} de alma', en: '{n} soul' },
    noFocus:        { es: 'No puedes curarte', en: 'You cannot heal' },
    healNote:       { es: '{masks} por Concentración', en: '{masks} per Focus' },
    maskOne:        { es: '1 máscara', en: '1 mask' },
    maskMany:       { es: '{n} máscaras', en: '{n} masks' },
    soulNote:       { es: '{n} de alma', en: '{n} soul' },
    /* What the HUD's orb says on hover. The sheet's soul is spent by hand, like the masks;
       it's only for show, it changes no figure. */
    soulCastTitle:  { es: 'Lanzar un hechizo: −{n} de alma', en: 'Cast a spell: −{n} soul' },
    soulRefillTitle:{ es: 'Volver a llenar el alma', en: 'Refill your soul' },
    vesselEmptyTitle: { es: 'Vaciar esta vasija', en: 'Empty this vessel' },
    vesselFillTitle:  { es: 'Llenar hasta esta vasija', en: 'Fill up to this vessel' },
    vesselFillAllTitle: { es: 'Llenar el orbe y hasta esta vasija', en: 'Fill the orb and up to this vessel' },
    notchesFree:    { es: '{n} libres', en: '{n} free' },
    notchesFreeOne: { es: '1 libre', en: '1 free' },
    overcharmed:    { es: 'Sobrecarga', en: 'Overcharmed' },   // CHARM_TXT_OVERCHARMED
    overcharmedTo:  { es: 'sobrecarga', en: 'overcharmed' },   // after the arrow: "1 free → overcharmed"
    overcharmBanner:{ es: 'Has superado tus muescas disponibles: recibes el doble de daño de todas las fuentes y no puedes equipar ningún amuleto más.',
                      en: 'You have gone past your available notches: you take double damage from every source and cannot equip any more charms.' },
    seeAll:         { es: 'Ver todas las estadísticas', en: 'See every stat' },
    hideAll:        { es: 'Ocultar el detalle', en: 'Hide the detail' },
    charmEffects:   { es: 'Lo que te dan tus amuletos', en: 'What your charms give you' },
    noCharmsYet:    { es: 'No llevas ningún amuleto equipado todavía.', en: 'You are not wearing any charm yet.' },
    /* Effects: the plates below the charm band */
    effectsTitle:   { es: 'Efectos', en: 'Effects' },
    effectsHint:    { es: 'lo que hacen tus amuletos y no sale en las cifras', en: "what your charms do that the numbers don't show" },
    effectsNone:    { es: 'Todo lo que hacen tus amuletos ya está en las cifras de arriba.', en: 'Everything your charms do is already in the numbers above.' },
    fragileTitleOne:{ es: 'Se rompe', en: 'It breaks' },
    fragileTitle:   { es: 'Se rompen', en: 'They break' },
    fragileLineOne: { es: 'Se rompe {charms}; Comepiernas lo arregla', en: '{charms} breaks; Leg Eater repairs it' },
    fragileLine:    { es: 'Se rompen {charms}; Comepiernas los arregla', en: '{charms} break; Leg Eater repairs them' },

    /* Full sheet */
    sheetTitle:     { es: 'Ficha', en: 'Stat sheet' },
    rowHint:        { es: 'pulsa una fila para ver cómo se calcula', en: 'click a row to see how it is worked out' },
    howCalc:        { es: 'Cómo se calcula', en: 'How it is worked out' },
    breakdown:      { es: 'Desglose', en: 'Breakdown' },
    andMore:        { es: '+{n} más', en: '+{n} more' },
    compareWith:    { es: 'Comparar con', en: 'Compare with' },
    cmpBase:        { es: 'Caballero base', en: 'Base Knight' },
    cmpBaseHint:    { es: 'Aguijón antiguo, 5 máscaras, sin amuletos', en: 'Old Nail, 5 masks, no charms' },
    cmpNoCharms:    { es: 'Sin amuletos', en: 'No charms' },
    cmpNoCharmsHint:{ es: 'Tus mismas mejoras sin ningún amuleto', en: 'Your same upgrades with no charms' },
    cmpPinned:      { es: 'Build fijada', en: 'Pinned build' },
    cmpPinnedHint:  { es: 'La build que fijaste', en: 'The build you pinned' },
    cmpPinFirst:    { es: 'Fija primero una build', en: 'Pin a build first' },
    pin:            { es: 'Fijar build actual', en: 'Pin this build' },
    pinHint:        { es: 'Guarda la build actual como referencia', en: 'Saves the current build as the reference' },
    unpin:          { es: 'Quitar', en: 'Remove' },
    vsBase:         { es: 'Respecto al Caballero base', en: 'Against the base Knight' },
    vsNoCharms:     { es: 'Respecto a tu build sin amuletos', en: 'Against your build with no charms' },
    vsPinned:       { es: 'Respecto a la build fijada', en: 'Against the pinned build' },
    vsRef:          { es: 'Respecto a la referencia', en: 'Against the reference' },
    notApplicable:  { es: 'no aplica', en: 'not applicable' },

    /* The health you have left, set on the health meter */
    hpFull:         { es: 'Vida completa', en: 'Full health' },
    hpOne:          { es: '1 máscara', en: '1 mask' },
    hpSetTitle:     { es: 'Quedarte en {n} máscaras', en: 'Drop to {n} masks' },
    hpFullTitle:    { es: 'Volver a la vida completa', en: 'Back to full health' },

    /* Your game */
    theNail:        { es: 'El aguijón', en: 'The nail' },
    body:           { es: 'Cuerpo', en: 'Body' },
    charmsTitle:    { es: 'Amuletos', en: 'Charms' },
    clearCharms:    { es: 'Vaciar', en: 'Clear' },
    clearCharmsHint:{ es: 'Quita todos los amuletos', en: 'Removes every charm' },
    masksField:     { es: 'Máscaras', en: 'Masks' },
    masksNote:      { es: 'de 5 a 9', en: 'from 5 to 9' },
    vesselsField:   { es: 'Vasijas de alma', en: 'Soul vessels' },
    vesselsNote:    { es: 'de 0 a 3', en: 'from 0 to 3' },
    notchesField:   { es: 'Muescas de amuletos', en: 'Charm notches' },
    notchesNote:    { es: 'de 3 a 11', en: 'from 3 to 11' },
    abilities:      { es: 'Habilidades', en: 'Abilities' },
    notFound:       { es: 'Sin conseguir', en: 'Not found' },
    cloakLbl:       { es: 'Capa', en: 'Cloak' },
    grimmPhase:     { es: 'Fase {n}', en: 'Phase {n}' },
    grimmNoAttack:  { es: 'No ataca', en: 'Does not attack' },
    grimmNeedsDream:{ es: 'Fase 4: se consigue venciendo al Rey Pesadilla Grimm, con el Aguijón Onírico', en: 'Phase 4: earned by defeating Nightmare King Grimm, with the Dream Nail' },
    inspMissing:    { es: 'Sin conseguir: haz clic para desbloquearlo', en: 'Not found: click to unlock it' },
    ownHere:        { es: 'Marcar como conseguido', en: 'Mark as found' },
    ownHereHint:    { es: 'Márcalo como conseguido en tu partida', en: 'Mark it as found in your game' },
    inspFixed:      { es: 'No se puede quitar', en: 'It cannot be removed' },
    ownedTitle:     { es: 'Amuletos conseguidos', en: 'Charms found' },
    ownAll:         { es: 'Todos', en: 'All' },
    ownNone:        { es: 'Ninguno', en: 'None' },
    less:           { es: 'Menos', en: 'Less' },
    more:           { es: 'Más', en: 'More' },
    none:           { es: 'ninguna', en: 'none' },

    /* Charm grid */
    quickHintHover: { es: 'un clic equipa o quita', en: 'one click equips or removes' },
    quickHintTouch: { es: 'un toque equipa o quita', en: 'one tap equips or removes' },
    quickHintUnlock:{ es: 'los apagados se desbloquean', en: 'the dimmed ones can be unlocked' },
    detailMore:     { es: 'y {n} más en la ficha completa', en: 'and {n} more in the full sheet' },
    detailSumTitle: { es: 'Lo que suman tus amuletos', en: 'What your charms add up to' },
    detailHintHover:{ es: 'Pasa el ratón por un amuleto para ver qué cambiaría en tu build; un clic lo equipa o lo quita.',
                      en: 'Hover a charm to see what it would change in your build; one click equips or removes it.' },
    detailHintTouch:{ es: 'Toca un amuleto para equiparlo o quitarlo: aquí verás qué cambia en tu build.',
                      en: 'Tap a charm to equip or remove it: what it changes in your build shows up here.' },
    unequipTitle:   { es: 'Quitar {charm}', en: 'Remove {charm}' },
    equipTitle:     { es: 'Equipar {charm}', en: 'Equip {charm}' },
    swapTitle:      { es: 'Sustituir {old} por {new}', en: 'Swap {old} for {new}' },

    /* The charm's detail, next to the grid */
    inspBlocked:    { es: '{reason}. Esto es lo que haría si tuvieras muescas libres:', en: '{reason}. This is what it would do with free notches:' },
    inspSwap:       { es: 'Sustituiría a {charm}', en: 'It would replace {charm}' },
    inspSwapOver:   { es: ' · te dejaría sobrecargado', en: ' · it would leave you overcharmed' },
    inspOver:       { es: 'Te dejaría sobrecargado: recibirías el doble de daño', en: 'It would leave you overcharmed: you would take double damage' },
    inspCond:       { es: '{cond}: ahora mismo no está activo', en: '{cond}: it is not active right now' },
    inspNeeds:      { es: 'Necesita {what}', en: 'It needs {what}' },
    inspEffectIn:   { es: 'Efecto en tu build', en: 'Effect on your build' },
    inspEffectIf:   { es: 'Efecto si lo equipas', en: 'Effect if you equip it' },
    inspEmpty:      { es: 'No cambia ninguna estadística con tu build actual.', en: 'It changes no stat in your current build.' },
    notchOne:       { es: '1 muesca', en: '1 notch' },
    notchMany:      { es: '{n} muescas', en: '{n} notches' },
    notchFree:      { es: 'Sin coste de muescas', en: 'No notch cost' },
    breaksOnDeath:  { es: 'se rompe al morir', en: 'breaks on death' },
    withCharms:     { es: 'con {charms}', en: 'with {charms}' },


    /* Deltas */
    dNew:           { es: 'nuevo', en: 'new' },
    dGone:          { es: 'ya no', en: 'gone' },
    dNowYes:        { es: 'ahora sí', en: 'now on' },
    dNowNo:         { es: 'ahora no', en: 'now off' },
    dWas:           { es: 'Antes: {v}', en: 'Before: {v}' },
    yes:            { es: 'Sí', en: 'Yes' },
    no:             { es: 'No', en: 'No' },
    withoutShort:   { es: 'sin {what}', en: 'no {what}' },
    notShort:       { es: 'no {what}', en: 'no {what}' },
    becomesShort:   { es: 'pasan a ser {what}', en: 'becomes {what}' },

    /* Requirements (charm.needs) */
    needSpellVs:    { es: 'Espíritu vengativo', en: 'Vengeful Spirit' },
    needSpellAny:   { es: 'un hechizo', en: 'a spell' },
    needArtAny:     { es: 'un arte del aguijón', en: 'a Nail Art' },
    needCloak1:     { es: 'la Capa de ala de polilla', en: 'the Mothwing Cloak' },
    needCloak2:     { es: 'la Capa sombría', en: 'the Shade Cloak' },
    needDream:      { es: 'el Aguijón Onírico', en: 'the Dream Nail' },

    /* Notices */
    linkCopied:     { es: 'Enlace copiado', en: 'Link copied' },
    copyThis:       { es: 'Copia este enlace:', en: 'Copy this link:' },
    toastOvercharm: { es: 'Sobrecarga: recibes el doble de daño', en: 'Overcharmed: you take double damage' },
    toastPinned:    { es: 'Build fijada como referencia', en: 'Build pinned as the reference' },

    /* Combat simulator */
    fightPick:      { es: 'Elige un enemigo', en: 'Pick an enemy' },
    fightPickLabel: { es: 'Enemigo', en: 'Enemy' },
    fightBosses:    { es: 'Jefes', en: 'Bosses' },
    fightEnemies:   { es: 'Enemigos', en: 'Enemies' },
    fightNone:      { es: 'Elige arriba contra quién quieres pelear', en: 'Pick who you want to fight above' },
    fightNoFoe:     { es: 'Elige un enemigo para ver sus ataques.', en: 'Pick an enemy to see its attacks.' },
    fightNoTarget:  { es: 'Sin enemigo al que pegar', en: 'Nothing to hit yet' },
    fightCount:     { es: '{n} en la lista', en: '{n} on the list' },
    fightPhase:     { es: 'Fase {n} de {total}', en: 'Phase {n} of {total}' },
    fightStanding:  { es: '{n} en pie de {total}', en: '{n} standing of {total}' },
    fightTotal:     { es: '{n} en total', en: '{n} in total' },
    fightSummons:   { es: 'Invoca', en: 'Summons' },
    fightSummonOne: { es: 'Invocar {name}', en: 'Summon {name}' },
    fightMinions:   { es: 'Lo que ha salido', en: 'What it has summoned' },
    logPhase:       { es: 'Cae la fase {n}. Entra la {next}.', en: 'Phase {n} falls. Phase {next} begins.' },
    logNextIn:      { es: 'Entra otro. Quedan {left} por entrar.', en: 'Another steps in. {left} still to come.' },
    logFrenzy:      { es: 'Frenesí: el que queda sube a {n} y se cura.', en: 'Frenzy: the survivor goes up to {n} and heals.' },
    logDecisive:    { es: '{name} cae y con ella se acaba el combate.', en: '{name} falls and the fight ends with it.' },
    logSummon:      { es: 'Sale {name}: {n} de vida.', en: '{name} appears: {n} health.' },
    logMinion:      { es: '{name} cae. +{soul} de alma.', en: '{name} falls. +{soul} soul.' },
    logMinionNoSoul:{ es: '{name} cae. No da alma.', en: '{name} falls. It gives no soul.' },
    // Spells, impact by impact
    selHint:        { es: 'Qué impactos de {spell} entran', en: 'Which impacts of {spell} land' },
    selCount:       { es: '{n} de {max}', en: '{n} of {max}' },
    selTwice:       { es: 'Le da dos veces: {n}', en: 'Hits twice: {n}' },
    selLeft:        { es: 'izquierda', en: 'left' },
    selRight:       { es: 'derecha', en: 'right' },
    logSpellPartial:{ es: '{move}: {k} de {of} impactos, −{n}. Le quedan {left}', en: '{move}: {k} of {of} impacts, −{n}. {left} left' },
    logSpellTwice:  { es: '{move}: le da dos veces, −{n}. Le quedan {left}', en: '{move}: hits twice, −{n}. {left} left' },
    logSpellMiss:   { es: '{move}: no le da', en: '{move}: it misses' },
    fightClear:     { es: 'Sin enemigo', en: 'No enemy' },
    fightNoMatch:   { es: 'Nada con ese nombre', en: 'Nothing by that name' },
    /* The Hunter's Journal, which is the enemy picker */
    jrTitle:        { es: 'Diario del Cazador', en: 'Hunter\'s Journal' },   // INV_NAME_JOURNAL
    jrOpen:         { es: 'Seleccionar enemigo', en: 'Select enemy' },
    jrClose:        { es: 'Cerrar', en: 'Close' },
    jrSearch:       { es: 'Buscar en el Diario', en: 'Search the Journal' },
    jrAll:          { es: 'Todos', en: 'All' },
    jrEntry:        { es: 'Entrada', en: 'Entry' },
    jrHitsHead:     { es: 'Golpes', en: 'Hits' },
    jrOtherKind:    { es: 'Aquí no está: míralo en {kind}', en: 'Not here: look under {kind}' },
    jrBlank:        { es: 'Elige una entrada del Diario', en: 'Pick an entry from the Journal' },
    jrBack:         { es: 'Diario', en: 'Journal' },           // PANE_JOURNAL
    jrNum:          { es: 'Nº {n}', en: 'No. {n}' },
    jrBoss:         { es: 'Jefe', en: 'Boss' },
    jrEnemy:        { es: 'Enemigo', en: 'Enemy' },
    jrNoEntry:      { es: 'No tiene entrada propia en el Diario del Cazador.', en: 'It has no entry of its own in the Hunter\'s Journal.' },
    jrShared:       { es: 'Comparte entrada con {name}.', en: 'It shares its entry with {name}.' },
    jrHp:           { es: 'Vida', en: 'Health' },
    jrPhases:       { es: 'en {n} fases', en: 'across {n} phases' },
    jrNailHits:     { es: 'Golpes de aguijón', en: 'Nail hits' },
    jrNailNote:     { es: 'con tu aguijón de {n}', en: 'with your {n}-damage nail' },
    jrHitOf:        { es: 'si te pega de {n} máscaras', en: 'if it hits you for {n} masks' },
    jrHitOfOne:     { es: 'si te pega de 1 máscara', en: 'if it hits you for 1 mask' },
    knight:         { es: 'El Caballero', en: 'The Knight' },
    fightReset:     { es: 'Reiniciar', en: 'Reset' },
    fightResetHint: { es: 'Vuelve a empezar con la vida llena', en: 'Start again at full health' },
    yourMoves:      { es: 'Tus ataques', en: 'Your attacks' },
    foeMoves:       { es: 'Sus ataques', en: 'Its attacks' },
    fightLog:       { es: 'Registro', en: 'Log' },
    mvNail:         { es: 'Aguijón', en: 'Nail' },
    fightUndo:      { es: 'Deshacer', en: 'Undo' },
    fightUndoHint:  { es: 'Deshace tu última acción o su último golpe (Ctrl+Z)', en: 'Undo your last action or its last hit (Ctrl+Z)' },
    /* The scoreboard between the Knight and the enemy: hits left on each side. */
    vsLabel:        { es: 'Lo que queda', en: 'What is left' },
    vsToWin:        { es: 'golpes de aguijón para ganar', en: 'nail hits to win' },
    vsToWinOne:     { es: 'golpe de aguijón para ganar', en: 'nail hit to win' },
    vsToFall:       { es: 'golpes suyos para caer', en: 'of its hits to fall' },
    vsToFallOne:    { es: 'golpe suyo para caer', en: 'of its hits to fall' },
    vsFallHint:     { es: 'de su ataque más fuerte, que quita {n} máscaras', en: 'of its strongest attack, which takes {n} masks' },
    vsFallHintOne:  { es: 'de su ataque más fuerte, que quita 1 máscara', en: 'of its strongest attack, which takes 1 mask' },
    vsFallRadiant:  { es: 'en {diff}, un golpe te mata', en: 'on {diff}, one hit kills you' },
    /* The fight in figures, under its ending. */
    sumTime:        { es: 'Tiempo', en: 'Time' },
    sumHits:        { es: 'Golpes dados', en: 'Hits dealt' },
    sumTaken:       { es: 'Vida perdida', en: 'Health lost' },
    sumSoul:        { es: 'Alma gastada', en: 'Soul spent' },
    sumFocus:       { es: 'Curas', en: 'Heals' },
    contact:        { es: 'Contacto', en: 'Contact' },
    perHitNote:     { es: 'por golpe', en: 'per hit' },
    soulLower:      { es: 'alma', en: 'soul' },
    focusMove:      { es: 'Concentrarse', en: 'Focus' },
    fightInvuln:    { es: 'No se le puede dañar', en: 'Cannot be damaged' },
    maskUnit:       { es: 'máscaras', en: 'masks' },
    maskUnitOne:    { es: 'máscara', en: 'mask' },
    diffAt:         { es: 'Armonía', en: 'Attuned' },          // CHALLENGE_UI_LEVEL1
    diffAs:         { es: 'Ascendido', en: 'Ascended' },       // CHALLENGE_UI_LEVEL2
    diffRa:         { es: 'Radiante', en: 'Radiant' },         // CHALLENGE_UI_LEVEL3
    logHit:         { es: '{move}: −{n}. Le quedan {left}', en: '{move}: −{n}. {left} left' },
    logKill:        { es: '{foe} cae. {hits} golpes en total.', en: '{foe} falls. {hits} hits in total.' },
    logTake:        { es: '{move}: −{n}, te quedan {left}', en: '{move}: −{n}, you have {left} left' },
    logDown:        { es: 'Has caído. Le habías quitado {done} de {total}.', en: 'You are down. You had taken {done} of {total}.' },
    logRadiant:     { es: 'Radiante: {move} te mata de un golpe.', en: 'Radiant: {move} kills you in one hit.' },
    logFocus:       { es: 'Concentración: +{n}, tienes {left}', en: 'Focus: +{n}, you have {left}' },
    logStart:       { es: 'Contra {foe}: {hp} de vida.', en: 'Against {foe}: {hp} health.' },
    // Charms in the arena (design/04-charms-in-combat.md §3.3 and §3.4)
    moveDash:       { es: 'Avance rápido sombrío', en: 'Shadow Dash' },   // that's what CHARM_DESC_16 calls it
    moveDream:      { es: 'Aguijón Onírico', en: 'Dream Nail' },
    moveWeavers:    { es: 'Tejedoras', en: 'Weaverlings' },
    moveWait:       { es: 'Esperar {s} s', en: 'Wait {s} s' },
    waitFor:        { es: 'hasta lo próximo de {charm}', en: 'until the next {charm} tick' },
    moveNegate:     { es: '♪ Anulado', en: '♪ Negated' },
    noSoulNote:     { es: 'sin alma', en: 'no soul' },
    fightShell:     { es: 'coraza {n}/{max}', en: 'shell {n}/{max}' },
    fightMelody:    { es: 'Melodía {pct}', en: 'Melody {pct}' },
    fightClock:     { es: '{s} s', en: '{s} s' },
    fightFocusing:  { es: 'Concentrando… un golpe ahora te quita la cura', en: 'Focusing… a hit now costs you the heal' },
    fightFocusDone: { es: 'Listo', en: 'Done' },
    fightVoidCalm:  { es: 'Con el Corazón del Vacío no te ataca', en: 'With Void Heart it does not attack you' },
    fightNotes:     { es: 'Amuletos que aquí no se simulan', en: 'Charms not simulated here' },
    fightClockNote: { es: 'El tiempo cuenta lo que ocupan tus acciones, no la pelea: esquivar no está, y los hechizos van a 0 s porque la wiki no da su tiempo de lanzamiento.',
                      en: 'The clock counts what your actions take, not the fight: dodging is not in, and spells take 0 s because the wiki gives no cast time.' },
    logElegy:       { es: 'Elegía: −{n}. Le quedan {left}', en: 'Elegy: −{n}. {left} left' },
    logThorns:      { es: 'Espinas de agonía: −{n}. Le quedan {left} (pueden ser dos golpes)', en: 'Thorns of Agony: −{n}. {left} left (it can hit twice)' },
    logGrubsong:    { es: 'Canción de larvas: +{soul} de alma', en: 'Grubsong: +{soul} soul' },
    logNegated:     { es: 'Melodía: {move} anulado, −{n} evitado', en: 'Melody: {move} negated, −{n} avoided' },
    logShell:       { es: 'Coraza de baldur: absorbe {move}. Le quedan {left} golpes', en: 'Baldur Shell absorbs {move}. {left} hits left' },
    logFocusLost:   { es: 'Cura interrumpida: pierdes {n} y {soul} de alma', en: 'Focus interrupted: you lose {n} and {soul} soul' },
    logIframes:     { es: 'Invulnerable {s} s: te caben {hits} golpes', en: 'Invulnerable for {s} s: room for {hits} hits' },
    logFragile:     { es: 'Se rompe: {charms}', en: 'Broken: {charms}' },
    logSpore:       { es: 'Hongo con esporas: ~−{n}. Le quedan {left}', en: 'Spore Shroom: ~−{n}. {left} left' },
    logDash:        { es: 'Avance rápido sombrío: −{n}, sin alma. Le quedan {left}', en: 'Shadow Dash: −{n}, no soul. {left} left' },
    logDream:       { es: 'Aguijón Onírico: +{soul} de alma', en: 'Dream Nail: +{soul} soul' },
    logDreamNo:     { es: 'El Aguijón Onírico no le saca alma', en: 'The Dream Nail draws no soul from it' },
    logWeavers:     { es: 'Tejedoras: −{n}. Le quedan {left}', en: 'Weaverlings: −{n}. {left} left' },
    logWeaversSoul: { es: 'Tejedoras con Canción de larvas: +{soul} de alma', en: 'Weaverlings with Grubsong: +{soul} soul' },
    logWait:        { es: 'Esperas {s} s', en: 'You wait {s} s' },
    logKingsoul:    { es: 'Alma del Monarca: +{soul} de alma', en: 'Kingsoul: +{soul} soul' },
    logGrimm:       { es: 'Niño de Grimm: −{n} ({shots} disparos). Le quedan {left}', en: 'Grimmchild: −{n} ({shots} shots). {left} left' },
    logWomb:        { es: 'Útero brillante: −{n} y −{soul} de alma. Le quedan {left}', en: 'Glowing Womb: −{n} and −{soul} soul. {left} left' },
    logHiveblood:   { es: 'Sangrecolmena: +1, tienes {left}', en: 'Hiveblood: +1, you have {left}' },
    // Dreamshield (design/04 §3.5): the wiki's two lists of projectiles
    moveShield:     { es: 'Escudo Onírico', en: 'Dreamshield' },
    // Stagger, in hits (kb/01-mechanics.md §4; design/04 delivery 3)
    fightStaggerCount: { es: 'Aturdimiento {n}/{hits} · seguidos {combo}/{max}', en: 'Stagger {n}/{hits} · in a row {combo}/{max}' },
    fightStaggered: { es: 'Aturdido: tu próximo golpe lo levanta', en: 'Staggered: your next hit gets it back up' },
    fightBatsNow:   { es: 'Murciélagos: {s} s más · le puedes quitar {cap}', en: 'Bats: {s} s more · {cap} damage left to deal' },
    fightStaggeredToast: { es: 'Está aturdido: no ataca', en: 'It is staggered: it does not attack' },
    waitBats:       { es: 'hasta que se junten los murciélagos', en: 'until the bats gather again' },
    logStagger:     { es: '{name} se aturde ({n} golpes). Tu próximo golpe lo levanta', en: '{name} is staggered ({n} hits). Your next hit gets it back up' },
    logStaggerCombo:{ es: '{name} se aturde con {n} golpes seguidos. Tu próximo golpe lo levanta', en: '{name} is staggered by {n} hits in a row. Your next hit gets it back up' },
    logStaggerEnd:  { es: 'Se levanta', en: 'It gets back up' },
    logStaggerWait: { es: 'Mientras esperas, se levanta', en: 'While you wait, it gets back up' },
    logBats:        { es: '{name} se dispersa en murciélagos {s} s: golpearlo no lo levanta y como mucho le quitas {cap}', en: '{name} scatters into bats for {s} s: hitting does not end it and you can deal at most {cap}' },
    logBatsEnd:     { es: 'Los murciélagos se juntan: vuelve', en: 'The bats gather: it is back' },
    logBatsCap:     { es: 'Murciélagos: {move} solo le quita {n}', en: 'Bats: {move} only deals {n}' },
    logBatsNone:    { es: 'Murciélagos: {move} ya no le quita nada', en: 'Bats: {move} deals nothing more' },
    shieldNote:     { es: 'sin alma; se rompe al chocar y vuelve a los 2 s', en: 'no soul; it breaks on impact and returns after 2 s' },
    shieldBroken:   { es: 'Escudo roto: vuelve a los 2 s', en: 'Shield broken: it returns after 2 s' },
    moveBlock:      { es: 'Parado', en: 'Blocked' },
    projBlock:      { es: 'el Escudo lo para', en: 'the Dreamshield blocks it' },
    projPierce:     { es: 'atraviesa el Escudo', en: 'it pierces the Dreamshield' },
    fightShieldOn:  { es: 'escudo entero', en: 'shield up' },
    fightShieldOff: { es: 'escudo roto', en: 'shield broken' },
    logBlocked:     { es: 'El Escudo para {move}: −{n} evitado. Se rompe 2 s', en: 'The Dreamshield blocks {move}: −{n} avoided. It breaks for 2 s' },
    logShield:      { es: 'Escudo Onírico: −{n}, sin alma. Le quedan {left}. Se rompe 2 s', en: 'Dreamshield: −{n}, no soul. {left} left. It breaks for 2 s' },
    hitsToKill:     { es: '{n} golpes de aguijón', en: '{n} nail hits' },
    /* The arena's explanations (js/app-arena.js, "The arena's explanations"): the "?" of an
       attack and the legend on the enemy's side. Between asterisks, the term as it appears on
       screen, which goes in bone like the figures. Charm and impact names arrive through
       {charm} and {label} from js/data.js and the engine: they aren't written here. */
    selLands:       { es: 'entran', en: 'land' },
    selSideGroup:   { es: 'Dónde tienes al enemigo', en: 'Where the enemy is' },
    selLeftHint:    { es: 'El enemigo, a tu izquierda: {n}', en: 'The enemy on your left: {n}' },
    selRightHint:   { es: 'El enemigo, a tu derecha: {n}', en: 'The enemy on your right: {n}' },
    helpOf:         { es: 'Cómo funciona: {name}', en: 'How it works: {name}' },
    helpFoe:        { es: 'Cómo leer su lado', en: 'How to read its side' },
    // Figures with their unit, with a non-breaking space ("{w} s"): when they broke, the "s" dropped alone onto the next line.
    helpNotches:    { es: 'Cada muesca es un impacto: encendida entra, en anillo falla. Tócalas para decir cuáles entraron.',
                      en: 'Each notch is one impact: lit it lands, a ring it misses. Tap them to set which ones landed.' },
    helpBursts:     { es: '{n} ráfagas de {v} ({n} × {v} = {total}): contra un blanco grande y quieto entran todas; contra uno pequeño o que se aparta, menos.',
                      en: '{n} hits of {v} ({n} × {v} = {total}): against a big target that stays put they all land; against a small one, or one that moves away, fewer.' },
    helpFlukes:     { es: '{n} {label} de {v} ({n} × {v} = {total}): de cerca entran casi todos; de lejos se abren y fallan más.',
                      en: '{n} {label} of {v} ({n} × {v} = {total}): up close nearly all of them land; from afar they spread out and more of them miss.' },
    helpVolatile:   { es: 'Un solo trematodo que estalla: {a} del impacto y {b} de la nube si se queda dentro sus {s}\u00a0s. La nube no cuenta para aturdir.',
                      en: 'A single fluke that bursts: {a} from the impact and {b} from the cloud if it stays inside for its {s}\u00a0s. The cloud does not count towards stagger.' },
    helpTwice:      { es: 'Un proyectil de {v}. Este jefe se mueve con él, así que puede llevárselo dos veces: enciende *×2* y son {n}.',
                      en: 'One projectile of {v}. This boss moves along with it, so it can take it twice: light *×2* and it is {n}.' },
    helpImDive:     { es: '{label} {v}: solo si le caes encima.', en: '{label} {v}: only if you land on it.' },
    helpImBoth:     { es: '{label} {v}: a los dos lados.', en: '{label} {v}: to both sides.' },
    helpImSide:     { es: '{label}: {v} si lo tienes a tu izquierda, {alt} a tu derecha.',
                      en: '{label}: {v} if it is on your left, {alt} on your right.' },
    helpImPlain:    { es: '{label} {v}.', en: '{label} {v}.' },
    helpCyclone:    { es: 'La cifra es la de un giro, y cada toque es uno que le da. En el juego salen {a} ({a} × {v} = {ta}), y hasta {b} si machacas el ataque ({tb}).',
                      en: 'The number is one spin, and each tap is one that lands. In the game you get {a} ({a} × {v} = {ta}), and up to {b} if you mash attack ({tb}).' },
    helpFocus:      { es: 'Curar {n}\u00a0{unit} lleva {t}\u00a0s ({a} de arranque + {b}). Hasta entonces, un golpe suyo te quita la cura y los {soul} de alma: pulsa «{done}» si acabó antes.',
                      en: 'Healing {n}\u00a0{unit} takes {t}\u00a0s ({a} to start + {b}). Until then, a hit from it takes away the heal and the {soul} soul: press “{done}” if it finished first.' },
    helpFocusBaldur:{ es: 'Con la {charm}, ese golpe no te daña, pero la cura se pierde igual.', en: 'With {charm}, that hit does no damage, but the heal is lost all the same.' },
    helpDream:      { es: 'No hace daño: le saca {soul} de alma, y cargarlo lleva {s}\u00a0s. Es el alma que te queda donde el aguijón no da.',
                      en: 'It deals no damage: it draws {soul} soul from it, and charging it takes {s}\u00a0s. It is the soul left to you where the nail gives none.' },
    helpFoeAttacks: { es: 'Sus ataques son botones: pulsa el que te alcance, y te quita las máscaras que dice.',
                      en: 'Its attacks are buttons: press the one that hits you, and it takes the masks it shows.' },
    helpFoeRadiant: { es: '*☠*: en {diff} cualquier golpe te mata. Pulsa el ataque que te alcance.', en: '*☠*: on {diff} any hit kills you. Press the attack that hits you.' },
    helpStagger:    { es: '*Aturdimiento*: cuenta golpes, no daño, y cada impacto de un hechizo es uno. Con {hits} queda aturdido, o con {max} seguidos si entre uno y otro pasan menos de {w}\u00a0s. Aturdido no ataca, y tu próximo golpe lo levanta.',
                      en: '*Stagger*: it counts hits, not damage, and each spell impact is one. {hits} hits stagger it, or {max} in a row less than {w}\u00a0s apart. Staggered, it does not attack, and your next hit gets it back up.' },
    helpStaggerBats:{ es: '*Aturdimiento*: cuenta golpes, no daño, y cada impacto de un hechizo es uno. Con {hits}, o {max} seguidos a menos de {w}\u00a0s, se dispersa en murciélagos {s}\u00a0s: golpearlo no lo levanta y como mucho le quitas {cap}.',
                      en: '*Stagger*: it counts hits, not damage, and each spell impact is one. After {hits}, or {max} in a row less than {w}\u00a0s apart, it scatters into bats for {s}\u00a0s: hitting does not bring it back and you can deal at most {cap}.' },
    helpStaggerHeavy:{ es: '{charm} ya resta uno a cada cifra.', en: '{charm} already takes one off each number.' },
    helpMelody:     { es: '*{neg}*: tócalo si la {charm} paró ese golpe. Aquí no hay dados: el porcentaje es su probabilidad de ahora, que sube con cada golpe que te llevas ({steps}) y vuelve a 0 al anular.',
                      en: '*{neg}*: press it if {charm} stopped that hit. There are no dice here: the percentage is its chance right now, which rises with every hit you take ({steps}) and goes back to 0 when it negates.' },
    helpBlock:      { es: '*{blocked}*: tócalo si el {charm} paró el proyectil. No te toca ni te corta la cura, y el escudo se rompe {s}\u00a0s.',
                      en: '*{blocked}*: press it if the {charm} stopped the projectile. It does not touch you or cut your heal, and the shield breaks for {s}\u00a0s.' },
    helpTarget:     { es: 'Tus golpes van a la tarjeta marcada a la izquierda; toca otra para cambiar.', en: 'Your hits go to the card marked on its left; tap another to switch.' },
    fightFocusDoneHint: { es: 'La cura acabó antes de su siguiente golpe', en: 'The heal finished before its next hit' },
    negateHint:     { es: 'Si la {charm} paró este golpe', en: 'If {charm} stopped this hit' },
    /* The end of a fight: a title and a line below it. «Victoria» and not «Derrotado», which
       in Spanish would have to agree with each enemy, and "Victory" because "Defeated" on its
       own reads in English as if you were the one defeated. */
    fightWon:       { es: 'Victoria', en: 'Victory' },
    fightWonNote:   { es: '{foe} cae tras {n} golpes', en: '{foe} falls after {n} hits' },
    fightWonNoteOne:{ es: '{foe} cae de un golpe', en: '{foe} falls in one hit' },
    fightDead:      { es: 'Has caído', en: 'You fell' },
    fightNoMoves:   { es: 'No ataca', en: 'Does not attack' },
    fightDeadNote:  { es: 'Le habías quitado {done} de {total}', en: 'You had dealt {done} of {total}' },
    noSoulFor:      { es: 'No te llega el alma', en: 'Not enough soul' },
    fullHealth:     { es: 'Ya estás al máximo', en: 'Already at full health' },
    cannotFocus:    { es: 'No puedes curarte', en: 'You cannot heal' },

    /* Hall of Gods. "Hall of Gods" (GG_SUMMARY_TITLE) and "Void Idol" (NAME_VOID_IDOL_1) are
       the game's text, and so are Attuned, Ascended and Radiant (diffAt/diffAs/diffRa:
       CHALLENGE_UI_LEVEL_1..3) and "Dream Nail" (INV_NAME_DREAMNAIL_A).
       The rest is the site's text. */
    fightTabHall:   { es: 'Salón de los Dioses', en: 'Hall of Gods' },   // GG_SUMMARY_TITLE
    fightTabHallShort: { es: 'Salón', en: 'Hall' },
    hallIdol:       { es: 'Ídolo del Vacío', en: 'Void Idol' },   // NAME_VOID_IDOL_1
    hallIdolOff:    { es: 'Aparece al vencer a los {n} en alguna dificultad.', en: 'It appears once all {n} are beaten on some difficulty.' },
    hallIdolOn:     { es: 'Los {n}, vencidos en {diff} o más.', en: 'All {n} beaten on {diff} or higher.' },
    hallCountTitle: { es: 'Símbolos ganados por dificultad', en: 'Symbols won per difficulty' },
    hallRules:      { es: 'Entrar cura del todo y caer te devuelve a la estatua. Ascendido dobla el daño y en Radiante un golpe te mata. Los símbolos son los de tu partida: se marcan en la placa de cada estatua.',
                      en: 'Entering heals you fully and falling returns you to the statue. Ascended doubles the damage and on Radiant one hit kills you. The symbols are those of your own game: mark them on each statue\'s plaque.' },
    hallFilterBtn:  { es: 'Ver cuáles faltan en {diff}', en: 'See which are missing on {diff}' },
    hallFilterOn:   { es: 'Se atenúan las {won} vencidas en {diff}; faltan {left}.', en: 'The {won} beaten on {diff} are dimmed; {left} to go.' },
    hallFilterOnOne:{ es: 'Se atenúa la única vencida en {diff}; faltan {left}.', en: 'The one beaten on {diff} is dimmed; {left} to go.' },
    hallFilterNone: { es: 'Ninguna vencida en {diff} todavía: faltan las {left}.', en: 'None beaten on {diff} yet: all {left} to go.' },
    hallNoMarks:    { es: 'sin símbolos', en: 'no symbols' },
    hallViaLever:   { es: 'Pedestal con palanca: dos versiones', en: 'Pedestal with a lever: two versions' },
    hallViaDream:   { es: 'Pedestal con atrapasueños: su versión onírica', en: 'Pedestal with a dreamcatcher: its dream version' },
    hallLever:      { es: 'Palanca: {name}', en: 'Lever: {name}' },
    hallDream:      { es: 'Aguijón Onírico: {name}', en: 'Dream Nail: {name}' },
    hallMarkSet:    { es: 'Marcar {diff} como vencido en tu partida', en: 'Mark {diff} as beaten in your game' },
    hallMarkUnset:  { es: 'Quitar el símbolo de {diff}', en: 'Remove the {diff} symbol' },
    hallMarkHint:   { es: 'Toca una dificultad para marcarla como vencida en tu partida.', en: 'Tap a difficulty to mark it as beaten in your game.' },
    /* Mark in bulk, on the Idol's panel: one symbol on all 44 at once. */
    hallBulk:       { es: 'Marcar en bloque', en: 'Mark in bulk' },
    hallBulkHint:   { es: 'Marcar o quitar un símbolo en las {n} estatuas a la vez', en: 'Mark or remove a symbol on all {n} statues at once' },
    hallBulkSet:    { es: 'Marcar las {n} en', en: 'Mark all {n} on' },
    hallBulkUnset:  { es: 'Quitar todas en', en: 'Remove all on' },
    hallBulkRule:   { es: 'Como en la placa: marcar Radiante marca también Ascendido, y quitar Ascendido quita Radiante.',
                      en: 'As on the plaque: marking Radiant also marks Ascended, and removing Ascended removes Radiant.' },
    hallBulkDoneSet:     { es: 'Símbolo de {diff} marcado en las {n} que faltaban.', en: '{diff} symbol marked on the {n} that were missing it.' },
    hallBulkDoneSetOne:  { es: 'Símbolo de {diff} marcado en la única que faltaba.', en: '{diff} symbol marked on the only one missing it.' },
    hallBulkDoneUnset:   { es: 'Símbolo de {diff} quitado en {n} estatuas.', en: '{diff} symbol removed from {n} statues.' },
    hallBulkDoneUnsetOne:{ es: 'Símbolo de {diff} quitado en una estatua.', en: '{diff} symbol removed from one statue.' },
    hallUndo:       { es: 'Deshacer', en: 'Undo' },
    hallColDiff:    { es: 'Dificultad', en: 'Difficulty' },
    hallColHits:    { es: 'Tus golpes', en: 'Your hits' },
    hallColSurvive: { es: 'Aguantas', en: 'You survive' },
    hallFightLbl:   { es: 'Luchar en', en: 'Fight on' },
    hallNotePhases: { es: 'Vida en {n} fases.', en: 'Health across {n} phases.' },
    hallNoteHits:   { es: 'Tus golpes: de aguijón, con el tuyo de {n}.', en: 'Your hits: nail hits, with your {n}-damage nail.' },
    hallNoteSurvive:{ es: 'Aguantas: golpes de su ataque más fuerte con la vida llena, que quita {at} máscaras ({asra} en Ascendido); en Radiante, uno te mata.',
                      en: 'You survive: hits from its strongest attack at full health, which takes {at} masks ({asra} on Ascended); on Radiant, one kills you.' },
    hallNoteSurviveOne:{ es: 'Aguantas: golpes de su ataque más fuerte con la vida llena, que quita {at} máscara ({asra} en Ascendido); en Radiante, uno te mata.',
                      en: 'You survive: hits from its strongest attack at full health, which takes {at} mask ({asra} on Ascended); on Radiant, one kills you.' },
    hallArena:      { es: 'Qué cambia:', en: 'What changes:' },
    hallArenaSame:  { es: 'Como en la partida, en las tres dificultades.', en: 'As in the base game, on all three difficulties.' },
    hallArenaPantheon: { es: 'Como en el Panteón, en las tres dificultades.', en: 'As in the Pantheon, on all three difficulties.' },
    hallBack:       { es: 'Volver al salón', en: 'Back to the hall' },
    /* The entrance tablet. Its title is fightTabHall: "Hall of Gods" appears in the game
       precisely there (GG_SUMMARY_TITLE). */
    hallTablet:     { es: 'Leer la tablilla', en: 'Read the tablet' },
    hallTabletHint: { es: 'La lista de la entrada del Salón, con el símbolo más alto de cada jefe', en: 'The list at the entrance to the Hall, with each boss\'s highest symbol' },
    hallStatues:    { es: 'Estatuas', en: 'Statues' },
    hallDied:       { es: 'Le habías quitado {done} de {total}, y vuelves a la estatua', en: 'You had dealt {done} of {total}, and you return to the statue' },

    /* Pantheons. The game's terms are copied, not translated: in Spanish «Panteones»,
       «Vínculos» and each one's name, «Capullos de Saviavida» and «Buscador de Dioses» come
       from the Spanish wiki; «Aguas termales» and «germen de vida», from the English wiki's
       Localisation block; «Banco», from the title of its Spanish page. */
    // The standalone fight, on Normal: the Combat screen's arena (not a game term).
    fightTabCombat: { es: 'Arenal', en: 'Arena' },
    fightTabPantheon:{ es: 'Panteones', en: 'Pantheons' },
    lifebloodLower: { es: 'de saviavida', en: 'Lifeblood' },
    pantheonPick:   { es: 'Panteón', en: 'Pantheon' },
    runRooms:       { es: '{n} salas', en: '{n} rooms' },
    bindingsLabel:  { es: 'Vínculos', en: 'Bindings' },
    bind_nail:      { es: 'Aguijón', en: 'Nail Binding' },
    bind_shell:     { es: 'Coraza', en: 'Shell Binding' },
    bind_charms:    { es: 'Amuletos', en: 'Charms Binding' },
    bind_soul:      { es: 'Alma', en: 'Soul Binding' },
    bindNote_nail:  { es: 'daño ×0,8 y como mucho 13: 4/7/10/13/13', en: 'damage ×0.8, at most 13: 4/7/10/13/13' },
    bindNote_shell: { es: 'como mucho 4 máscaras', en: 'at most 4 masks' },
    bindNote_charms:{ es: 'sin amuletos', en: 'no charms' },
    bindNote_soul:  { es: '33 de alma, sin vasijas extra', en: '33 soul, no extra vessels' },
    cocoonLabel:    { es: 'Capullos de Saviavida en los bancos', en: 'Lifeblood Cocoons at the benches' },
    doorDoneHint:   { es: 'debajo, los vínculos con que lo has terminado en tu partida', en: 'below each, the bindings you have completed it with in your game' },
    doorDoneLbl:    { es: 'Vínculos con que has terminado el {name}', en: 'Bindings you have completed the {name} with' },
    doorAllTip:     { es: 'Los cuatro a la vez (en el juego, sus marcas en oro)', en: 'All four at once (in the game, its marks turn gold)' },
    doorShut:       { es: 'Puerta cerrada: llevas {n} de {max} vínculos y te faltan {left} para abrirla.', en: 'Door locked: you have {n} of {max} bindings and need {left} more to open it.' },
    doorShutOne:    { es: 'Puerta cerrada: llevas {n} de {max} vínculos y te falta 1 para abrirla.', en: 'Door locked: you have {n} of {max} bindings and need 1 more to open it.' },
    doorOpenLine:   { es: 'Puerta abierta: llevas {n} de {max} vínculos.', en: 'Door open: you have {n} of {max} bindings.' },
    doorSeeds:      { es: 'El capullo de cada banco suelta {n} gérmenes: {n} máscaras de saviavida.', en: 'The cocoon at each bench releases {n} Lifeseeds: {n} Lifeblood masks.' },
    doorNext:       { es: 'Con {at} vínculos, {n}.', en: 'With {at} bindings, {n}.' },
    doorHelp:       { es: 'Marca bajo cada panteón los vínculos con que lo has terminado en tu partida (×4: los cuatro a la vez). Cada uno enciende una muesca de la puerta de la saviavida de Godhome, junto al Salón de los Dioses; con 8 se abre y pone un capullo en cada banco de los panteones.',
                      en: 'Under each pantheon, mark the bindings you have completed it with in your game (×4: all four at once). Each lights a notch on Godhome\'s Lifeblood door, next to the Hall of Gods; 8 open it and place a cocoon at every pantheon bench.' },
    runEnter:       { es: 'Entrar en el panteón', en: 'Enter the pantheon' },
    runSumNone:     { es: 'Sin vínculos', en: 'No bindings' },
    runRoom:        { es: 'Sala {n} de {total}', en: 'Room {n} of {total}' },
    runTimeline:    { es: 'Salas del panteón', en: 'Pantheon rooms' },
    runQuit:        { es: 'Abandonar', en: 'Give up' },
    runQuitDone:    { es: 'Has abandonado el {name}', en: 'You gave up the {name}' },
    runExit:        { es: 'Elegir otro', en: 'Choose another' },
    runWonRoom:     { es: 'Sala superada', en: 'Room cleared' },
    runNext:        { es: 'Siguiente sala', en: 'Next room' },
    runFinish:      { es: 'Terminar el panteón', en: 'Finish the pantheon' },
    runWon:         { es: 'Completado', en: 'Completed' },
    runDied:        { es: 'En la sala {n} de {total}: {foe}', en: 'In room {n} of {total}: {foe}' },
    runAgain:       { es: 'Otra vez', en: 'Again' },
    runJumpHint:    { es: 'Toca una sala para ir directo a ella; las que te saltes no cuentan como superadas.',
                      en: 'Tap a room to go straight to it; the ones you skip do not count as cleared.' },
    runJumpTo:      { es: 'Ir a {room}', en: 'Go to {room}' },
    runSkippedMark: { es: 'saltada', en: 'skipped' },
    runWonSkipped:  { es: 'Terminado', en: 'Finished' },
    runSkippedNote: { es: '{name}, con {n} salas saltadas', en: '{name}, with {n} rooms skipped' },
    logJump:        { es: 'Saltas de la sala {from} a la {to}.', en: 'You skip from room {from} to room {to}.' },
    restTitle:      { es: 'Aguas termales y banco', en: 'Hot Spring and Bench' },
    restHelp:       { es: 'Elige qué hacer y en qué orden: el banco borra la saviavida del capullo.',
                      en: 'Choose what to do and in which order: the bench removes the cocoon Lifeblood.' },
    restBath:       { es: 'Bañarse en las aguas termales', en: 'Bathe in the Hot Spring' },
    restBathNote:   { es: 'alma y máscaras al máximo', en: 'soul and masks to full' },
    restSit:        { es: 'Sentarse en el banco', en: 'Rest at the Bench' },
    restSitNote:    { es: 'toda la vida y la saviavida de amuletos; el alma no', en: 'all health and charm Lifeblood; not soul' },
    restCocoon:     { es: 'Romper el Capullo de Saviavida', en: 'Break the Lifeblood Cocoon' },
    restCocoonNote: { es: 'sentarse en el banco la borra', en: 'resting at the bench removes it' },
    /* What each station would give right now, after its figure: "+99 soul". */
    restUnitSoul:   { es: 'de alma', en: 'soul' },
    restUnitCocoon: { es: 'de saviavida del capullo', en: 'cocoon Lifeblood' },
    restRespawn:    { es: 'vuelve a poner el capullo', en: 'respawns the cocoon' },
    restFull:       { es: 'ya estás al máximo', en: 'already full' },
    restCocoonNone: { es: 'Sin capullo: en tu partida, la puerta de la saviavida sigue cerrada (hacen falta 8 vínculos)', en: 'No cocoon: in your game, the Lifeblood door is still locked (it takes 8 bindings)' },
    restCocoonTaken:{ es: 'Ya está roto; sentarse en el banco lo vuelve a poner', en: 'Already broken; resting at the bench respawns it' },
    restCharmsHint: { es: 'un toque equipa o quita; es la misma selección que en {screen}',
                      en: 'a tap equips or removes; it is the same selection as in {screen}' },
    restCharmsBound:{ es: 'El vínculo de Amuletos no deja equipar ninguno', en: 'The Charms Binding forbids equipping any' },
    restGo:         { es: 'Continuar', en: 'Continue' },
    /* Charms locked while a pantheon lasts (outside its benches) */
    runLockTag:     { es: 'En un panteón', en: 'In a Pantheon' },
    runLockWhere:   { es: '{name} · sala {n} de {total}.', en: '{name} · room {n} of {total}.' },
    runLockWhy:     { es: 'Los amuletos y las muescas solo se cambian en sus bancos.',
                      en: 'Charms and notches can only be changed at its benches.' },
    runLockWhyBound:{ es: 'Con el vínculo de Amuletos no se cambian ni en sus bancos.',
                      en: 'With the Charms Binding they cannot be changed even at its benches.' },
    runLock:        { es: 'Estás en el {name}: amuletos y muescas solo se cambian en sus bancos',
                      en: 'You are in the {name}: charms and notches can only be changed at its benches' },
    runLockBound:   { es: 'Estás en el {name} con el vínculo de Amuletos: no se pueden cambiar',
                      en: 'You are in the {name} with the Charms Binding: they cannot be changed' },
    runLockShort:   { es: 'bloqueados: estás en un panteón', en: 'locked: you are in a pantheon' },
    runLockGo:      { es: 'Ir al panteón', en: 'Go to the pantheon' },
    runLockUrl:     { es: 'El enlace traía otros amuletos; se quedan los del panteón', en: 'The link had other charms; the pantheon ones stay' },
    godseeker:      { es: 'Buscador de Dioses', en: 'Godseeker' },   // GODSEEKER_MAIN
    godseekerNote:  { es: 'Una sala sin pelea: solo se cruza.', en: 'A room without a fight: you just walk through.' },
    logEnter:       { es: 'Entras en el {name}: máscaras llenas.', en: 'You enter the {name}: masks full.' },
    logBath:        { es: 'Aguas termales: {soul} de alma y {masks} máscaras.', en: 'Hot Spring: {soul} soul and {masks} masks.' },
    logSit:         { es: 'Banco: vida completa.', en: 'Bench: full health.' },
    logSitLost:     { es: 'Banco: vida completa, pero pierdes {n} de saviavida del capullo.', en: 'Bench: full health, but you lose {n} cocoon Lifeblood.' },
    logCocoon:      { es: 'Capullo roto: +{n} de saviavida.', en: 'Cocoon broken: +{n} Lifeblood.' },

    /* Hunter's Journal: your game. What the game says comes from its texts (the dump of its
       TextAssets; the key goes alongside) and isn't translated: the game's Spanish carries its
       typos («estas empezando») and they stay. The title is jrTitle (INV_NAME_JOURNAL), the
       back button jrBack (PANE_JOURNAL). */
    hjSeen:         { es: 'Encontrado', en: 'Encountered' },                                  // ENCOUNTERED
    hjDone:         { es: 'Completado', en: 'Completed' },                                    // COMPLETED
    hjKill1:        { es: 'Derrota', en: 'Defeat' },                                          // KILL_COUNT_1
    hjKill2:        { es: 'más para descifrar las notas del Cazador.', en: 'more to decipher the Hunter\'s notes.' },   // KILL_COUNT_2
    hjNewEntry:     { es: 'Nueva entrada en el diario', en: 'New Journal Entry' },            // NOTIFICATION_HALF
    hjUpdated:      { es: 'Diario actualizado', en: 'Journal Updated' },                      // NOTIFICATION_FULL
    hjMarkKept:     { es: 'La marca se guardará en el Diario del Cazador.', en: 'The mark will be kept in the Hunter\'s Journal.' },   // GET_HUNTERMARK_2
    hjReward:       { es: '¿Listo para recibir la recompensa?', en: 'Ready to receive reward?' },   // HUNTER_REWARD
    hjSuper:        { es: 'El', en: 'The' },                                                  // HUNTER_SUPER
    hjMain:         { es: 'Cazador', en: 'Hunter' },                                          // HUNTER_MAIN
    hjKeen:         { es: 'Cazador entusiasta', en: 'Keen Hunter' },                          // HUNTER_1_TITLE
    hjKeenText:     { es: 'Registra todas las criaturas de Hallownest en el Diario del Cazador', en: 'Record all of Hallownest\'s creatures in the Hunter\'s Journal' },   // HUNTER_1_TEXT
    hjTrue:         { es: 'Cazador auténtico', en: 'True Hunter' },                           // HUNTER_2_TITLE
    hjTrueText:     { es: 'Recibe la Marca de cazador', en: 'Receive the Hunter\'s Mark' },   // HUNTER_2_TEXT
    /* What the Hunter tells you according to your progress (HK.hunter.hunterLine; thresholds from
       the wiki's "The Hunter" page). */
    hjSaysConvo1:   { es: '¡Pequeño enclenque! Puede que hayas derrotado a algunas criaturas, pero solo estas empezando.\n\n¡No te retrases, desciende al centro de este mundo y caza toda vida que veas!',
                      en: 'Little squib! You may have overcome a few creatures, but you are only just beginning.\n\nDon\'t delay, descend into the belly of this world and hunt down the life you find!' },   // HUNTER_CONVO_1
    hjSaysConvo2:   { es: 'Ahhh... Sabía que la había visto. Esa habilidad como cazador. Las criaturas de Hallownest caen a tu paso.\n\nNo pares ahora, pequeño enclenque, hay muchas más que encontrar, acechar y matar.',
                      en: 'Ahhh... I knew I\'d seen it right. That hunter\'s quality. Hallownest\'s creatures fall in your path.\n\nDon\'t stop now little squib, many more there are to find, and stalk, and kill.' },   // HUNTER_CONVO_2
    hjSaysConvo3:   { es: '¡Ajá! Tu diario se va agrandando y llenando. Solo quedan unas pocas bestias raras que acechar.\n\nBusca en cada esquina del reino. Completa el diario. Consigue tu merecida recompensa...',
                      en: 'Ah ha! Your journal grows fat and full. Only those last few, rare beasts remain left to stalk.\n\nSearch the kingdom\'s corners. Complete the journal. Earn your well deserved reward...' },   // HUNTER_CONVO_3
    hjSaysEntriesDone: { es: 'Así que te has enfrentado a todas las bestias de estas tierras. ¡Impresionante! Pero te queda una tarea, pequeño enclenque.\n\n¡Sigue cazando criaturas hasta que descifres mis notas! Solo entonces te reconoceré como compañero cazador y recibirás tu recompensa.',
                      en: 'So, you\'ve encountered all of the beasts in this land. Impressive! But one task remains, little squib.\n\nKeep hunting down creatures until you have deciphered all of my notes! Only then will I recognise you as my fellow Hunter and you shall receive your reward.' },   // HUNTER_ENTRIES_COMPLETED
    hjSaysComplete: { es: 'Tu diario... ¡déjame verlo!\n\nSí... ¡Sí! ¡El Diario del Cazador está completo!\n\nHas demostrado ser un verdadero cazador, un maestro de la muerte, y con gran placer te entrego la recompensa que mereces...',
                      en: 'Your journal... let me see it!\n\nYes... Yes! The Hunter\'s journal is complete!\n\nYou have proven yourself a true hunter, a master of killing, and so with great pleasure I will give you the reward you deserve...' },   // HUNTER_COMPLETE
    hjSaysGotMark:  { es: 'Posees mi marca y se te reconocerá como a uno de los míos. Compañero cazador, ya no tengo nada más que ofrecerte.',
                      en: 'You have my mark, and you shall be recognised as one of my rare caste. Fellow Hunter, I have nothing else to give you.' },   // GOT_MARK
    /* What the site writes */
    hjNav:          { es: '{title}: {done} de {total} completadas', en: '{title}: {done} of {total} completed' },
    hjUnseen:       { es: 'Sin encontrar', en: 'Not encountered' },
    hjStateLbl:     { es: 'En tu partida', en: 'In your game' },
    hjStepDown:     { es: 'Una muerte más', en: 'One more defeat' },
    hjStepUp:       { es: 'Una muerte menos', en: 'One defeat fewer' },
    hjLeftLbl:      { es: 'Muertes que te faltan', en: 'Defeats left' },
    hjLeftShort:    { es: 'Faltan {n}', en: '{n} left' },
    hjNotYet:       { es: 'Aún no la has encontrado.', en: 'You have not encountered it yet.' },
    hjStart:        { es: 'Viene completa con el Diario.', en: 'It comes complete with the Journal.' },
    hjInspect:      { es: 'Se consigue inspeccionándolo:', en: 'You get it by inspecting it:' },
    hjInspectOr:    { es: 'O inspeccionando su cadáver:', en: 'Or by inspecting its corpse:' },
    hjAuto:         { es: 'Se abre sola al recoger el Fragmento blanco, sin matar a ninguno.', en: 'It opens by itself when you pick up the White Fragment, without defeating any.' },
    hjMarkLocked:   { es: 'Te faltan {n} de las {total} para la Marca de cazador.', en: '{n} of the {total} still to go for the Hunter\'s Mark.' },
    hjMarkLockedOne:{ es: 'Te falta 1 de las {total} para la Marca de cazador.', en: '1 of the {total} still to go for the Hunter\'s Mark.' },
    hjMarkDropped:  { es: 'Ya no tienes las {total}: la Marca de cazador se va.', en: 'You no longer have all {total}: the Hunter\'s Mark goes.' },
    hjIdolFrom:     { es: 'Llega al vencer a los 44 del Salón de los Dioses, y sale de tus símbolos de allí.', en: 'It comes from beating all 44 in the Hall of Gods, and follows your symbols there.' },
    hjIdolTier:     { es: 'Tu Ídolo del Vacío: {diff}', en: 'Your Void Idol: {diff}' },
    hjCountsTitle:  { es: 'Recuentos del Diario', en: 'Journal counts' },
    hjShowLbl:      { es: 'Mostrar', en: 'Show' },
    hjShowAll:      { es: 'Todo', en: 'All' },
    hjTotalNote:    { es: 'El total empieza en {req} y sube hasta {max} con las opcionales que encuentras.', en: 'The total starts at {req} and grows to {max} with the optional entries you encounter.' },
    hjHowTo:        { es: 'Marca cada entrada como va en tu partida.', en: 'Mark each entry as it stands in your game.' },
    hjFolio:        { es: 'Nº {n}', en: 'No. {n}' },
    hjShowTip:      { es: 'Desde «Todo», deja solo esas; con otra elegida, se suma o se quita', en: 'From "All", shows only those; with another picked, adds or removes it' },
    hjRules:        { es: 'Es tu partida real: se marca a mano y el simulador no la toca. Como en el juego, el total empieza en las 146 que pide la Marca de cazador y sube con cada opcional que encuentras.',
                      en: 'This is your real game: you mark it by hand and the simulator never touches it. As in the game, the total starts at the 146 the Hunter\'s Mark asks for and grows with every optional entry you encounter.' },
    /* Mark in bulk: over whatever is in the list (with no filter, all 168) */
    hjBulk:         { es: 'Marcar en bloque', en: 'Mark in bulk' },
    hjBulkHint:     { es: 'Encontrar, completar o desmarcar a la vez las que elijas, o todas las de la lista', en: 'Encounter, complete or unmark at once the ones you pick, or every entry in the list' },
    hjBulkScope:    { es: 'En las {n} de la lista', en: 'On the {n} in the list' },
    hjBulkScopeOne: { es: 'En la única de la lista', en: 'On the only one in the list' },
    hjBulkSeen:     { es: 'Encontrar', en: 'Encounter' },
    hjBulkDone:     { es: 'Completar', en: 'Complete' },
    hjBulkNone:     { es: 'Desmarcar', en: 'Unmark' },
    hjBulkCount:    { es: '{n} cambiarían', en: '{n} would change' },
    hjBulkScopePicked: { es: 'En las {n} seleccionadas', en: 'On the {n} selected' },
    hjBulkScopePickedOne: { es: 'En la seleccionada', en: 'On the selected one' },
    hjPick:         { es: 'Seleccionar {name}', en: 'Select {name}' },
    hjPicked:       { es: 'seleccionada', en: 'selected' },
    hjPickAll:      { es: 'Todas', en: 'All' },
    hjPickNone:     { es: 'Ninguna', en: 'None' },
    hjBulkPickShort: { es: 'Marca casillas para elegir solo algunas.', en: 'Tick boxes to pick just some.' },
    hjBulkPickHint: { es: 'Marca casillas para elegir varias (Mayús: un tramo; desde el teclado, Espacio). Sin ninguna, va sobre la lista: busca o usa las pestañas para acotarla. La Marca de cazador solo entra al completar, si ya están las 146.',
                      en: 'Tick boxes to pick several (Shift: a run; from the keyboard, Space). With none ticked it works on the list: search or use the tabs to narrow it. The Hunter\'s Mark only comes in when completing, once all 146 are there.' },
    hjBulkDidSeen:  { es: '{n} entradas encontradas.', en: '{n} entries encountered.' },
    hjBulkDidSeenOne: { es: 'Una entrada encontrada.', en: 'One entry encountered.' },
    hjBulkDidDone:  { es: '{n} entradas completadas.', en: '{n} entries completed.' },
    hjBulkDidDoneOne: { es: 'Una entrada completada.', en: 'One entry completed.' },
    hjBulkDidNone:  { es: '{n} entradas desmarcadas.', en: '{n} entries unmarked.' },
    hjBulkDidNoneOne: { es: 'Una entrada desmarcada.', en: 'One entry unmarked.' },
  };

  let lang = 'en';   // English by default

  const pick = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? (v[lang] !== undefined ? v[lang] : v.es) : v);

  function t(key, vars) {
    const entry = UI[key];
    let s = entry ? pick(entry) : key;
    if (vars) for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }

  const locale = () => (lang === 'en' ? 'en-GB' : 'es-ES');
  const nf = (max, min = 0) => new Intl.NumberFormat(locale(), { minimumFractionDigits: min, maximumFractionDigits: max });

  function setLang(next) {
    lang = next === 'es' ? 'es' : 'en';
    HK.i18n.lang = lang;
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
    return lang;
  }

  HK.i18n = { UI, lang, t, pick, nf, setLang, get current() { return lang; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = HK.i18n;
})();
