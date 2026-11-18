cd /tmp/claude-0/-home-user-Singhtml-exprience/9bb3dbba-a96a-55b0-89ee-67e0f6ec87dc/scratchpad
cat parts/01_head.html > game.html && echo "" >> game.html
for f in parts/02_core.js parts/03_render.js parts/04_audio.js parts/05_world.js parts/06_chars.js parts/07_player.js parts/08_combat.js parts/09_systems.js parts/10_kit.js parts/11_regions_a.js parts/12_regions_b.js parts/13_story.js parts/14_game.js parts/15_ui.js parts/16_main.js; do cat $f >> game.html; done
python3 -c "
s=open('game.html').read(); a=s.index('<script>')+8; b=s.rindex('</script>'); open('check.js','w').write(s[a:b])"
node --check check.js && echo SYNTAX_OK
