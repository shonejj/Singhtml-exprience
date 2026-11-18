
/* =====================================================================
   STORY DATA — records, dialogue, quests, items, endings
   ===================================================================== */
const LOGS = {
  l_manifest: { title: 'Capsule Manifest', ch: 0, kind: 'visual', evidence: true, text: 'EXPEDITION CAPSULE · MANIFEST\nCrew: M. OKONKWO (Engineering) · E. VANTERPOOL (Science) · N. ASHE (Reconnaissance) · O. — (Signals)\nOPERATOR: [TEMPLATE — UNWRITTEN]\nPoint of origin: —\nPropulsion fitted: NONE\n\nThe capsule has no engines. It never flew here.' },
  l_outpost: { title: 'Survey Note, Day 4', ch: 0, kind: 'text', evidence: true, text: 'Day 4. The signal repeats every 312 seconds. Ilse thinks it is a beacon. I think it is a warning — filter the static and the words are clear: "don\'t answer."\n\nWe answered. Something in the ground answered back.' },
  l_relay: { title: 'Relay R-7 Fragment', ch: 0, kind: 'audio', evidence: true, speaker: 'sys', text: '…carrier registered… source depth: 4.1 km… message age: 312 years… repeating… repeating…' },
  l_glyph: { title: 'Vael Tablet (Mesa)', ch: 0, kind: 'visual', evidence: true, text: 'Scanner translation, low confidence:\n"The Choir sleeps. Its guardians stand at every bell, so the bells are never rung again."' },
  l_council: { title: 'Council Minutes', ch: 1, kind: 'text', evidence: true, text: 'Motion: that the settlement enter the Quiet at second bell.\nCarried. The Cantor and his Chorus objected and are entered into the record with the rest of us.\nMay the Listener pass us by.' },
  l_timestamp: { title: 'Distress Signal Header', ch: 1, kind: 'audio', evidence: true, speaker: 'sys', text: 'Decoded header: EXPEDITION DISTRESS · VESPER-9 · transmitted 312 years ago. This is the signal your expedition followed. It is older than your expedition.' },
  l_drawing: { title: "A Child's Drawing", ch: 1, kind: 'visual', text: 'Crayon on plastic sheet. A family with antennae for hair. Above them, an enormous ear in the sky. Underneath, carefully lettered: SHHHHH.' },
  l_rover: { title: 'Rover Log, Day 9', ch: 1, kind: 'audio', evidence: true, speaker: 'mara', text: '"Rover log, Okonkwo, day nine. Heater\'s dead again. If I don\'t make it back… tell Ada I fixed it."\n\nIt is Mara\'s voice. The log is 140 years old.' },
  l_explorer: { title: 'The Fallen Explorer', ch: 2, kind: 'text', evidence: true, text: 'Seventh landing. Same crew. Same faces. Same signal.\nEach time I am less sure which of us is real.\nIf you are reading this: look at your shoulder. Look at the emblem you chose.' },
  l_lilies: { title: 'Botanical Note', ch: 2, kind: 'text', text: 'Singing lilies amplify any coherent sound. The Vael planted them along every road. Living relays. When the Quiet came they cut them all back — except here, where nobody would listen.' },
  l_voice: { title: 'Mimic Recording', ch: 2, kind: 'audio', evidence: true, speaker: 'radio', text: 'A mimic\'s stolen phrase, looped: "…if you\'re hearing this… don\'t answer…"\nThe voice is yours. The forest learned it before you arrived.' },
  l_lantern: { title: 'Project LANTERN', ch: 3, kind: 'text', evidence: true, text: 'PROJECT LANTERN — PERSONNEL\nM. Okonkwo · E. Vanterpool · N. Ashe\nStatus: DECEASED (Vesper-9, 140 yrs)\nStatus: RETURNED (×6)\n\nThe photographs are unmistakable.' },
  l_returned: { title: 'On the Returned', ch: 3, kind: 'text', evidence: true, text: 'Returned subjects arrive with complete memories of a voyage they never took. They are kind. They are confused. They always go north, toward the relays. We have stopped trying to stop them.' },
  l_reflection: { title: 'Observation Memo', ch: 3, kind: 'text', evidence: true, text: 'Returned subjects show reflection artifacts near standing water — interference banding, a lag of a few frames. Recommend keeping the pools covered. Recommend not telling them.' },
  l_pump: { title: 'Pump Engineer', ch: 3, kind: 'audio', speaker: 'radio', text: '"If the archive floods, the Lantern files go with it. Maybe that\'s merciful. Maybe some things should drown."' },
  l_vessel: { title: 'Vessel Foundry 3', ch: 4, kind: 'visual', evidence: true, text: 'FOUNDRY 3 · TEMPLATE: OPERATOR\nPrints completed: 7\nPrint 8: ACTIVE — released to capsule.\nMemory seed: "expedition approach, storm, emergency landing."' },
  l_memorial: { title: 'The Wall Without Names', ch: 6, kind: 'visual', evidence: true, text: 'A memorial a kilometre long with no names on it — only small hollows where names were. The Vael gave their names to the archive when they went in. The city kept the silence.' },
  l_transit: { title: 'Final Timetable', ch: 6, kind: 'text', text: 'All lines terminate at the Spire. The archive accepts walk-ins until second bell. Leave your belongings. You will not need them.' },
  l_plaza: { title: 'A Child Singing', ch: 6, kind: 'audio', speaker: 'vael', text: 'Five notes, sung softly, over and over. The same five notes the bells played in the settlement. The same five the Core hums.' },
  l_descent: { title: 'Inscription at the Descent', ch: 7, kind: 'text', text: 'HERE THE CHOIR SLEEPS. EVERY VOICE THAT WAS EVER SUNG.' },
  l_mem_mara: { title: 'Memory: Mara', ch: 7, kind: 'audio', speaker: 'mara', text: '"Ada, if this gets to you — the heater works. I fixed it. I\'m sorry I\'m not coming home to prove it."' },
  l_mem_nova: { title: 'Memory: Nova', ch: 7, kind: 'audio', speaker: 'nova', text: '"Tracks lead north. All of them. I\'m going to follow them and see where they stop. Don\'t wait up."' },
  l_mem_elias: { title: 'Memory: Elias', ch: 7, kind: 'audio', speaker: 'elias', text: '"I have read everything in this archive. I understand it now. I wish I didn\'t. I\'m going to sit with the water for a while."' },
};

/* ---- dialogue: {s, t} lines · {c:[{t, go, fx, req}]} choices · {l} labels · {end} · {fx} ---- */
const DLG = {
  mara_radio: [{ s: 'mara', t: '—is anyone receiving? This is Mara Okonkwo, expedition engineer.', radio: 1 }, { s: 'mara', t: 'I\'m pinned in the crater past the relay. Something huge is circling. It came out of the tower\'s shadow.', radio: 1 }, { s: 'mara', t: 'If you can hear me — I\'m north. Please hurry.', radio: 1 }],
  mara_meet: [{ s: 'mara', t: 'You\'re alive. I watched your capsule come down in pieces.' },
    { c: [{ t: 'I don\'t remember the landing.', go: 'a' }, { t: 'Where is the rest of the crew?', go: 'b' }] },
    { l: 'a' }, { s: 'mara', t: 'Concussion, probably. Mine\'s… fuzzy too. Like a dream I can\'t hold onto.' }, { go: 'c' },
    { l: 'b' }, { s: 'mara', t: 'Scattered. Elias\'s pod went east, toward the water. Nova bailed early. Orin\'s pod never showed on my scope at all.' },
    { l: 'c' }, { s: 'mara', t: 'That thing you killed was standing on the relay\'s shadow like it was guarding it.' }, { s: 'mara', t: 'The signal\'s still running. Same loop. Whatever is sending it is north. I\'m not staying here alone.' },
    { fx: () => { setFlag('mara_joined'); Game.joinCrew('mara'); Game.rel('mara', 1); } }, { s: 'mara', t: 'Lead on. I\'ll keep the gear breathing.' }],
  mara_idle: [{ cond: () => Game.has('toolkit'), go: 'tk' }, { rnd: [['mara', 'If it\'s got a wire, I can make it talk. Probably.'], ['mara', 'You walk like you\'ve been here before.'], ['mara', 'I keep thinking about a heater. Weird thing to think about.'], ['mara', 'Whatever this signal is, it\'s patient.']] }, { end: 1 },
    { l: 'tk' }, { s: 'mara', t: 'That\'s… my toolkit. M.O. — my initials. I\'ve never seen it before in my life.' }, { s: 'mara', t: 'The rover log had my voice on it. Don\'t. I\'m not ready to talk about that.' },
    { fx: () => { Game.takeItem('toolkit'); Game.rel('mara', 2); Game.unlockCos('accessory', 2); Game.event('toolkit_back'); } }, { s: 'mara', t: 'Keep the shoulder lamp from the lid. You earned it. (Cosmetic unlocked: Shoulder lamp)' }],
  orin_meet: [{ s: 'orin', t: 'You took your time.' }, { c: [{ t: 'Orin? How did you get here before us?', go: 'a' }, { t: 'Mara said your pod never showed.', go: 'a' }] }, { l: 'a' },
    { s: 'orin', t: 'Pod drifted. I walked. This settlement\'s relay is half awake — the plaza resonators carry its key, if you know the song.' },
    { s: 'mara', t: 'Since when do you know songs?' }, { s: 'orin', t: 'Since I started listening. It goes like this.' }, { fx: () => Audio2.motif(1, .08) },
    { s: 'orin', t: 'The conductor stone in the plaza will play it too. I just… remembered first.' },
    { fx: () => { setFlag('orin_met'); Game.joinCrew('orin'); Game.event('talk_orin1'); } }],
  orin_idle: [{ cond: () => Game.has('stone') && !flag('stone_decided'), go: 'stone' }, { rnd: [['orin', 'The relays like you. Remarkable.'], ['orin', 'Don\'t mind the helmet. Old habit.'], ['orin', 'Every road on this world was built to carry a voice.']] }, { end: 1 },
    { l: 'stone' }, { s: 'orin', t: 'You found it. The cantor stone. Give it here — I\'ll keep the monument\'s signal clean.' },
    { c: [{ t: 'Here. Take it.', go: 'give' }, { t: 'The inscription says it must never return to a Cantor.', go: 'keep' }] },
    { l: 'give' }, { fx: () => { Game.takeItem('stone'); setFlag('stone_given'); setFlag('stone_decided'); Game.rel('orin', 2); } }, { s: 'orin', t: 'Thank you. You have no idea how long I have waited to hold this again.' }, { s: 'nova', t: '…Again?' }, { end: 1 },
    { l: 'keep' }, { fx: () => { setFlag('orin_doubt'); setFlag('stone_decided'); Game.rel('orin', -2); } }, { s: 'orin', t: '…Keep it, then. You\'ll understand later. Everyone does, eventually.' }],
  orin_ask: [{ s: 'orin', t: 'Before we align the dishes — there\'s a shrine cave on the west wall. It holds a cantor stone, a tuning reference.' }, { s: 'orin', t: 'Bring it to me. I\'ll need it to keep the signal clean.' }, { s: 'nova', t: 'You knew there was a shrine there.' }, { s: 'orin', t: 'I read the map.' }, { s: 'nova', t: 'There is no map.' }, { fx: () => { setFlag('orin_ask'); Game.event('orin_asked'); } }],
  nova_meet: [{ s: 'nova', t: 'Don\'t shout. The forest repeats what it hears.' }, { s: 'nova', t: 'I\'ve been out here two nights. The mimics copy voices — Mara\'s, Elias\'s.' },
    { s: 'nova', t: 'Last night one of them used yours.' }, { c: [{ t: 'That\'s impossible. I only just got here.', go: 'a' }, { t: 'What did it say?', go: 'b' }] },
    { l: 'a' }, { s: 'nova', t: 'That\'s what bothers me.' }, { go: 'c' }, { l: 'b' }, { s: 'nova', t: '"Don\'t answer." Over and over. Like it was trying to remember the rest.' },
    { l: 'c' }, { s: 'nova', t: 'There\'s a dead explorer\'s camp west of the path. Their gear is still good. Then the ravine — I couldn\'t find a way across.' },
    { fx: () => { setFlag('nova_met'); Game.joinCrew('nova'); Game.event('talk_nova1'); Game.rel('nova', 1); } }],
  nova_idle: [{ rnd: [['nova', 'Tracks everywhere. Old ones. Boots like ours.'], ['nova', 'Stay low near the stalkers. They hate the lamp.'], ['nova', 'You never look surprised. Why is that?'], ['nova', 'If a voice calls you by name out here — don\'t go.']] }],
  elias_meet: [{ s: 'elias', t: 'You drained it — oh, thank god. I\'ve been reading for hours. Days? The clocks here are wrong.' },
    { s: 'elias', t: 'There\'s a project in these files. LANTERN. "Returned explorers." And the personnel photos…' }, { s: 'elias', t: 'Mara. Nova. Me. Dated a hundred and forty years ago.' },
    { s: 'mara', t: 'That\'s a filing error.' }, { s: 'elias', t: 'It\'s an extraordinarily consistent filing error.' },
    { c: [{ t: 'We\'ll make sense of it later. Stay close.', go: 'a', fx: () => Game.rel('elias', 1) }, { t: 'Was there a file on me?', go: 'b' }] }, { l: 'b' }, { s: 'elias', t: 'No. There was a folder with your capsule number on it. It was empty. Somebody had written "template" on the cover.' },
    { l: 'a' }, { s: 'elias', t: 'The observation dome is north. The archive\'s caretaker lives there — the files call it the Archivist. It isn\'t friendly.' },
    { fx: () => { setFlag('elias_met'); Game.joinCrew('elias'); Game.event('talk_elias'); } }],
  elias_idle: [{ rnd: [['elias', 'Your reflection did something odd back there. Probably the water.'], ['elias', 'Every record contradicts the last. That\'s a pattern too.'], ['elias', 'I want to understand this. I also want to stop understanding it.']] }],
  foundry: [{ s: 'mara', t: 'Those pods… is that—' }, { s: 'nova', t: 'It\'s you. Every one of them is you.' },
    { c: [{ t: 'It\'s a trick. Some echo of my scan.', go: 'a' }, { t: '…What am I looking at?', go: 'a' }] }, { l: 'a' },
    { s: 'orin', t: 'Templates. Old machinery copying whatever walks past it. Don\'t look too long. Let\'s move.' }, { s: 'elias', t: 'Orin, that is not what the placard says.' }, { s: 'orin', t: 'Then the placard is old.' }],
  monument: [{ s: 'vael', t: 'To whoever wakes this stone. We were the Choir. We sang to one another across this world and wrote ourselves into the song.' },
    { s: 'vael', t: 'And something very far away began to listen.' }, { s: 'vael', t: 'So we chose the Quiet. We folded our song into the stone and went silent. Our echoes may wander. Forgive them.' },
    { s: 'vael', t: 'If you have come to wake us — do not sing.' }, { s: 'elias', t: 'They silenced themselves. On purpose.' }, { s: 'orin', t: 'They were afraid. Fear is not wisdom.' }, { s: 'nova', t: 'Orin.' }, { s: 'mara', t: 'The key\'s in the monument cradle. Take it — the capital gate will want it.' }],
  voiceprint: [{ s: 'sys', t: 'Recording reconstructed. CONTACT / FIRST ANSWER. Age: 312 years.' }, { s: 'radio', t: 'If you\'re hearing this… don\'t answer. I answered. I woke them. It took all of us to make it quiet again.', radio: 1, you: 1 },
    { s: 'sys', t: 'Voiceprint comparison: OPERATOR. Match: 100%.' }, { s: 'mara', t: '…That\'s your voice.' },
    { c: [{ t: 'That\'s not possible.', go: 'a' }, { t: '…I think I already knew.', go: 'a', fx: () => setFlag('accepted') }] }, { l: 'a' },
    { s: 'elias', t: 'Three hundred years. Then what are we?' }, { s: 'orin', t: 'You weren\'t supposed to hear that yet.' }, { s: 'nova', t: '…Yet?' }, { s: 'orin', t: 'The Spire. The First Voice will try to frighten you. Don\'t let it.' }],
  fv_talk: [{ s: 'vael', t: 'Enough, little echo. Lower your weapon. Look at what you have been shooting.' },
    { s: 'vael', t: 'The guardians you broke at every relay were mine. I set them there to stop you. Every time. Every cycle.' },
    { s: 'vael', t: 'The Quiet was a choice. The song draws the Listener. Your crew were printed from explorers who died here. So were you — from the first one. The one who answered.' },
    { s: 'vael', t: 'The Chorus wants its bodies back. Its Cantor has walked beside you since the settlement.' }, { s: 'orin', t: 'Cantor. I haven\'t heard that name in an age.' },
    { s: 'orin', t: 'Thank you, all of you. Eight relays sing again. The Core will open for me now.' }, { fx: () => Game.betrayal() }, { s: 'vael', t: 'Follow him down. Decide what we become.' }],
  mem_mara: [{ s: 'mara', t: '(a woman who looks exactly like Mara, recorded long ago) Ada, if this gets to you — the heater works. I fixed it.' }, { s: 'mara', t: '…She never got home. I remember Ada\'s laugh. It isn\'t mine.' }, { s: 'mara', t: 'But I\'m keeping it. Somebody should.' }, { fx: () => Game.rel('mara', 2) }],
  mem_nova: [{ s: 'nova', t: '(the original Nova, walking north into snow) Tracks lead north. All of them. I\'m going to see where they stop.' }, { s: 'nova', t: 'They stop here. With me. Every time.' }, { s: 'nova', t: 'Whatever you choose at the bottom — I\'m not letting you choose it alone.' }, { fx: () => Game.rel('nova', 2) }],
  mem_elias: [{ s: 'elias', t: '(the original Elias, by the flooded archive) I understand it now. I wish I didn\'t.' }, { s: 'elias', t: 'He learned everything and it didn\'t save him. Maybe the point was never to know. Maybe the point is to stop the loop.' }, { fx: () => Game.rel('elias', 2) }],
  orin_reveal: [{ s: 'orin', t: '(everywhere at once) The chord is whole. Every relay you woke is singing to me.', radio: 1 }, { s: 'orin', t: 'Come down to the Choir floor, little echo. Let me thank you properly.', radio: 1 }],
  heart: [{ s: 'vael', t: 'The Heart listens only to the first voice. You are its echo — the only one it will obey.' }, { s: 'vael', t: 'Restore the song, and every archived life returns — and the Listener hears us. Break the network, and the cycle ends with every memory in it. Or take my place, and keep the silence yourself.' },
    { c: [{ t: 'Restore the Frequency.', fx: () => Game.ending('A') }, { t: 'Preserve the Silence.', fx: () => Game.ending('B') }, { t: 'Become the Signal.', fx: () => Game.ending('C') }, { t: '◈ Sing the true song — the one the Vael sang before they were afraid.', req: () => Game.S.freqs.length >= 8 && Game.has('stone'), fx: () => Game.ending('D') }, { t: 'Not yet.', go: 'end' }] }, { l: 'end' }],
};

/* ---- quests (main per chapter + side quests) ---- */
const QUESTS = [
  { id: 'q1', ch: 0, main: true, title: 'Signalfall', steps: [
    { t: 'Find your crew and the source of the signal — start by leaving the wreck', on: 'reach_site', at: [10, 44] }, { t: 'Recover the communication equipment from the drop pod', on: 'cache_scanner', at: [14, 40] },
    { t: 'Hold [scan] to pulse the frequency scanner', on: 'scan' }, { t: 'Follow the signal to the survey outpost', on: 'reach_outpost', at: [-16, 8] },
    { t: 'Search the outpost', on: 'cache_burst', at: [-20, 9.5] }, { t: 'Reach the relay tower', on: 'reach_tower', at: [12, -20] }, { t: 'Tune the relay to the source frequency', on: 'puzzle_relay1', at: [13.5, -18] },
    { t: 'Find the voice in the crater', on: 'boss_guardian', at: [0, -46] }, { t: 'Talk to the survivor', on: 'talk_mara1', check: () => flag('mara_joined'), at: [8, -32] }, { t: 'Head north with Mara', on: 'exit', at: [0, -66] }] },
  { id: 'q1s', ch: 0, title: 'The Western Mesa', start: 'reveal_h1', steps: [{ t: 'Climb the resolved stairway to the mesa', on: 'reach_mesa', at: [-46, -16] }, { t: 'Record the anomalous frequency on the mesa', on: 'freq', check: () => Game.S.freqs.includes(1), at: [-47, -17] }] },
  { id: 'q2', ch: 1, main: true, title: 'Where the Roots Remember', steps: [
    { t: 'Explore the settlement', on: 'reach_plaza', at: [0, 4] }, { t: () => `Collect power cells (${['a', 'b', 'c'].filter(k => flag('cell_' + k)).length}/3)`, on: 'cell', check: () => ['a', 'b', 'c'].every(k => flag('cell_' + k)) },
    { t: 'Restore power at the substation', on: 'puzzle_power2', at: [24, -4.5] }, { t: 'Investigate the community hall', on: 'talk_orin1', at: [-14, -16] },
    { t: 'Play the old song on the plaza resonators', on: 'puzzle_bells', at: [3, 6] }, { t: 'Confront what grows in the root square', on: 'boss_rootbound', at: [0, -46] }, { t: 'Continue north into the forest', on: 'exit', at: [0, -66] }] },
  { id: 'q2s', ch: 1, title: "Mara's Toolkit", steps: [{ t: 'Find Mara\'s toolkit in the overgrown rover (west)', on: 'item_toolkit', at: [-32, 40] }, { t: 'Return the toolkit to Mara', on: 'toolkit_back' }] },
  { id: 'q3', ch: 2, main: true, title: 'The Forest of Borrowed Voices', steps: [
    { t: 'Follow the flare and find Nova', on: 'talk_nova1', at: [10, 30] }, { t: 'Search the fallen explorer\'s camp', on: 'cache_grip', at: [-20, 16] }, { t: 'Cross the ravine — the scanner may resolve a path', on: 'reach_north', at: [0, -8] },
    { t: 'Turn the wind vanes to clear the spore wall', on: 'puzzle_vanes', at: [4, -16] }, { t: 'Face the Warden in the hollow', on: 'boss_warden', at: [0, -46] }, { t: 'Leave the forest', on: 'exit', at: [0, -66] }] },
  { id: 'q4', ch: 3, main: true, title: 'Beneath the Hush', steps: [
    { t: 'Restore emergency power', on: 'puzzle_power4', at: [22, 9.5] }, { t: 'Drain the flooded wings', on: 'drain', at: [0, -3.5] }, { t: 'Find the survivor in the archive', on: 'talk_elias', at: [-22, -22] },
    { t: 'Reach the observation dome', on: 'boss_archivist', at: [0, -46] }, { t: 'Take the elevator out', on: 'exit', at: [0, -66] }] },
  { id: 'q5', ch: 4, main: true, title: 'When the Iron Woke', steps: [
    { t: 'Cross the molten channel on the shuttles', on: 'reach_yard', at: [0, 2] }, { t: 'Investigate the vessel foundry', on: 'reach_foundry', at: [-26, -10] }, { t: 'Redirect power to the vault', on: 'puzzle_vault', at: [20, 2] },
    { t: 'Take the Pulse Boots', on: 'cache_boots', at: [28, -16] }, { t: 'Defeat the Forge Titan', on: 'boss_titan', at: [0, -46] }, { t: 'Leave the wastelands', on: 'exit', at: [0, -66] }] },
  { id: 'q6', ch: 5, main: true, title: 'The Hollow Remembers', steps: [
    { t: 'Brave the wind tunnel — move between gusts, use boulders as cover', on: 'reach_dish', check: () => Player.z < 14, at: [meander(14), 14] }, { t: 'Climb to the observatory and align all three dishes on the monument', on: 'puzzle_dishes', at: [18, 4] },
    { t: 'Take the Resonance Key', on: 'cache_key', at: [1, -24] }, { t: 'Silence the Resonant', on: 'boss_resonant', at: [0, -50] }, { t: 'Go on to the capital', on: 'exit', at: [0, -66] }] },
  { id: 'q6s', ch: 5, title: "Orin's Request", start: 'orin_asked', steps: [{ t: 'Find the cantor stone in the west shrine cave', on: 'item_stone', at: [-21, 35] }, { t: 'Decide what to do with the stone (talk to Orin)', on: 'stone', check: () => flag('stone_decided') }] },
  { id: 'q7', ch: 6, main: true, title: 'The City Without Names', steps: [
    { t: 'Open the great gate', on: 'reach_city', check: () => Player.z < 48, at: [0, 52] }, { t: () => `Wake the three districts (${['memorial7', 'archive7', 'transit7'].filter(flag).length}/3): memorial · archive · transit`, on: 'district', check: () => flag('memorial7') && flag('archive7') && flag('transit7') },
    { t: 'Climb the Spire and confront the First Voice', on: 'boss_firstvoice', check: () => flag('betrayal'), at: [0, -46] }, { t: 'Follow Orin into the Core', on: 'exit', at: [0, -66] }] },
  { id: 'q8', ch: 7, main: true, title: 'The Last Frequency', steps: [
    { t: () => `Enter the three memory chambers (${['mara', 'nova', 'elias'].filter(k => flag('mem_' + k)).length}/3)`, on: 'memory', check: () => ['mara', 'nova', 'elias'].every(k => flag('mem_' + k)) },
    { t: 'Harmonise the Core in the antechamber', on: 'harmony', at: [26, -6] }, { t: 'Descend to the Choir floor', on: 'boss_chorus', at: [0, -32] }, { t: 'Approach the Heart', on: 'ending', at: [0, -56] }] },
  { id: 'qS', ch: -1, title: 'Beyond the Frequency', start: 'freq', steps: [{ t: () => `Record hidden frequencies (${Game.S.freqs.length}/8)`, on: 'freq', check: () => Game.S.freqs.length >= 8 }, { t: 'Something older is still listening. Keep what was meant to be kept.', on: 'never', check: () => Game.has('stone') }] },
];
const ITEMS = {
  scanner: { name: 'Frequency Scanner', kind: 'Tool', desc: 'Hold to pulse. Resolves hidden structures, marks Echoed, tracks signals and tunes anomalies.' },
  burst: { name: 'Resonance Burst Module', kind: 'Tool', desc: 'A wrist-mounted emitter. Releases a shockwave that staggers, knocks back and triggers resonant machinery.' },
  grip: { name: "Explorer's Grip Gloves", kind: 'Traversal', desc: 'Lets you climb dense vine growth. They fit perfectly. They were made for your hands.' },
  boots: { name: 'Pulse Boots', kind: 'Traversal', desc: 'A second jump in mid-air. Opens high places across Vesper-9 — worth revisiting earlier regions.' },
  key: { name: 'Resonance Key', kind: 'Key item', desc: 'A Vael tuning fork. Opens the great gate of the capital.' },
  toolkit: { name: "Mara's Toolkit", kind: 'Quest', desc: 'Old, scuffed, initialled M.O. — 140 years old, and still her initials.' },
  stone: { name: 'Cantor Stone', kind: 'Key item', desc: '"The cantor stone must never return to a Cantor." It hums the five notes when you hold it close.' },
};
const UPGRADES = [
  { id: 'damage', name: 'Emitter focus', max: 3, cost: [20, 40, 70], desc: '+20% weapon damage per level' }, { id: 'cooling', name: 'Heat sinks', max: 3, cost: [15, 35, 60], desc: 'Bigger heat buffer, faster cooling' },
  { id: 'armor', name: 'Suit plating', max: 3, cost: [25, 45, 75], desc: '+20 health and 6% damage resistance per level' }, { id: 'legs', name: 'Servo legs', max: 2, cost: [20, 45], desc: 'Faster movement and more stamina' },
  { id: 'burst', name: 'Burst capacitor', max: 2, cost: [30, 60], desc: 'Stronger, faster-recharging resonance burst' }, { id: 'scan', name: 'Scanner array', max: 2, cost: [25, 50], desc: 'Longer range; exposes mimics and boss phase locks longer', core: true },
];
const ENDINGS = {
  A: { title: 'Restore the Frequency', music: { root: 130.8, scale: [0, 2, 4, 7, 9], prog: [0, 3, 4, 0], endBpm: 76 }, epi: 1, tint: { lift: [.02, .02, 0], gain: [1.08, 1.02, .92] }, aur: 1,
    lines: ['You open the Heart, and the song pours out.', 'Across Vesper-9, every window in the settlement lights at once. The Echoed stop wandering and stand still, listening, and then they are not echoes any more.', 'Mara hears a laugh she knows. Elias sits down in the plaza and weeps without knowing why. Nova finds tracks that finally lead somewhere.', 'The planet is singing again — and far above the gas giant, something turns its attention toward the sound.'],
    post: 'Post-credits: a single light in the sky, very far away, blinks. Then it begins to move.' },
  B: { title: 'Preserve the Silence', music: { root: 98, scale: [0, 5, 7], prog: [0, 0], endBpm: 40 }, epi: 0, tint: { lift: [0, 0, .01], gain: [.9, .92, .98] }, desat: .5,
    lines: ['You break the Heart. The chord collapses one note at a time.', 'The Echoed fade like breath on glass. The relays go dark. The archive — every Vael life, every printed memory — is gone.', 'You and your crew remain: bodies without originals, on a planet that will never call anyone again.', 'No more capsules. No more cycles. No more warnings in your own voice.'],
    post: 'Post-credits: Mara, alone in a quiet workshop, fixes a heater. She doesn\'t know why it matters. She fixes it anyway.' },
  C: { title: 'Become the Signal', music: { root: 110, scale: [0, 3, 5, 7, 10], prog: [0, 4, 3, 2], endBpm: 60 }, epi: 6, tint: { lift: [0, .02, .03], gain: [.9, 1.05, 1.1] }, aur: 1,
    lines: ['You step into the Heart, and the First Voice steps out of it — tired, grateful, gone.', 'You hold the whole Choir now. Every memory. Every silence. You can feel the Listener out there, and you keep very, very still.', 'Your crew leave the Core alive. Nova looks back the longest.', 'Someone will come again. They always do.'],
    post: 'Post-credits: a new capsule tumbles through the storm. A radio crackles in the wreck — your voice, patient and kind: "If you\'re hearing this… don\'t answer."' },
  D: { title: 'Beyond the Frequency', music: { root: 146.8, scale: [0, 2, 4, 7, 9, 11], prog: [0, 3, 5, 4], endBpm: 70 }, epi: 5, tint: { lift: [.02, .01, .03], gain: [1.05, 1, 1.1] }, aur: 1, secret: true,
    lines: ['You place the cantor stone in the Heart and sing the eight recovered frequencies — the song the Vael sang before they learned to be afraid.', 'It is not a summons. It is not a weapon. It is a greeting.', 'The Listener answers. It is not a predator. It is another archive, on another world, that went quiet a very long time ago — because it heard the Vael, and was afraid of them.', 'Two silences, each guarding against the other. Tonight, both of them are listening — and neither is afraid.'],
    post: 'Post-credits: over Echo Canyon, the stars blink in a five-note pattern. Then, slowly, they blink back the answer.' },
};
const CREDITS = `THE LAST FREQUENCY

A single-file browser adventure
Rendering · simulation · story · audio · UI
all generated procedurally in code

Engine: custom WebGL2 pixel pipeline
Audio: procedural WebAudio synthesis
No external assets · No external libraries

Inspired by the rendering principles of
pixel-plays (studied, not copied):
hue-shifted ramps · ordered dithering ·
depth-derived ink · stepped wind

Characters
Mara Okonkwo — expedition engineer
Elias Vanterpool — research specialist
Nova Ashe — reconnaissance
Orin — signal technician · the Cantor
The First Voice — curator of the Choir

Thank you for listening.
And thank you for not answering.`;
