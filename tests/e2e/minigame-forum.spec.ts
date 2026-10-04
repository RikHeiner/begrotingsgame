/** Minigame Forum: "Geldtoren op het dakterras". */
import { expect, test, type APIRequestContext } from '@playwright/test';
import { SCHAAL_EURO, SCHAAL_MLN, waardeNaarStap } from '../../src/game/mgForum';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
});

test('Forum: geldstapels schatten op het dakterras, met level, hulpje en overzicht', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-minigame="forum"]').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('minigame-start').click();
  const spel = page.getByTestId('minigame-forum');
  await spel.getByRole('button', { name: 'Start level 1' }).click();

  const stand = spel.getByTestId('mg-forum-stand');
  await expect(stand).toContainText('Level 1 van 3');
  // Met minder beweging loopt er geen tijd: je speelt in je eigen tempo.
  await expect(stand).toContainText('Vraag 1 van 3');
  await expect(spel.getByTestId('mg-forum-tijd')).toHaveCount(0);

  const veld = spel.getByRole('img', { name: /dakterras van het Forum/ });
  const schuif = spel.getByRole('slider', { name: /Jouw schatting/ });

  for (let i = 0; i < 3; i++) {
    await expect(stand).toContainText(`Vraag ${i + 1} van 3`);
    await expect(spel.getByTestId('mg-forum-vraag')).toContainText('Hoeveel geeft de gemeente');
    await expect(veld).toHaveAttribute('aria-label', /echte stapel is nog verborgen/);
    const voor = await schuif.getAttribute('aria-valuetext');
    if (i === 0) {
      // slepen of tikken op het veld: hoog op het veld is een grote stapel
      const vak = await veld.boundingBox();
      if (!vak) throw new Error('geen veld');
      await veld.click({ position: { x: vak.width / 2, y: vak.height * 0.2 } });
      await expect(schuif).not.toHaveAttribute('aria-valuetext', voor ?? '');
      await expect(veld).toHaveAttribute('aria-label', /Jouw stapel: € \d+ mln/);
    } else {
      await schuif.focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await expect(schuif).not.toHaveAttribute('aria-valuetext', voor ?? '');
    }
    if (i === 1) {
      await spel.getByTestId('mg-forum-hulp').click();
      await expect(spel.locator('div[role="status"]')).toContainText('Ter vergelijking');
      await expect(spel.getByTestId('mg-forum-hulp')).toBeDisabled();
    }
    await spel.getByTestId('mg-forum-raad').click();
    const status = spel.locator('div[role="status"]');
    await expect(status).toContainText('per inwoner');
    await expect(status).toContainText(/keer te (hoog|laag)|precies/);
    await expect(veld).toHaveAttribute('aria-label', /De echte stapel: € [\d,]+ mln/);
    await expect(spel.getByTestId('mg-forum-volgende')).toBeFocused();
    await spel.getByTestId('mg-forum-volgende').click();
  }

  const einde = spel.getByTestId('mg-forum-einde');
  await expect(einde).toContainText(/Level 1/);
  await expect(einde).toContainText('Jij:');
  await einde.getByRole('button', { name: 'Stoppen' }).click();

  const uitslag = spel.getByTestId('mg-forum-uitslag');
  await expect(uitslag).toContainText('sterren');
  await expect(uitslag).toContainText('Wat je leerde');
  await expect(uitslag).toContainText('begroting 2027');
  await expect(uitslag).not.toContainText(/tegenbegroting/i);
  await uitslag.getByRole('button', { name: 'Naar de uitslag' }).click();
  await expect(page.getByTestId('minigame-klaar')).toContainText('van de 27');
});

/** De echte bedragen, zoals de game ze laadt: zo kan de test precies goed schatten. */
async function echteBedragen(request: APIRequestContext) {
  const config = (await (await request.get('/data/config.json')).json()) as {
    begroting: string;
    belastingenNederland: string;
  };
  const begroting = (await (await request.get(`/data/${config.begroting}`)).json()) as {
    onderdelen: { id: string; lasten_mln: number }[];
  };
  const spel = (await (await request.get('/data/spel/minigames.json')).json()) as {
    posten: { post: string; naam: string }[];
  };
  const nl = (await (await request.get(`/data/${config.belastingenNederland}`)).json()) as {
    inwoners: number;
  };
  const mln = new Map(begroting.onderdelen.map((o) => [o.id, o.lasten_mln]));
  return {
    inwoners: nl.inwoners,
    bedrag: new Map(spel.posten.map((p) => [p.naam, mln.get(p.post) ?? 0])),
  };
}

test('Forum: alle drie de levels met goede schattingen, ook per inwoner', async ({
  page,
  request,
}) => {
  const echt = await echteBedragen(request);
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-minigame="forum"]').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('minigame-start').click();
  const spel = page.getByTestId('minigame-forum');
  await spel.getByRole('button', { name: 'Start level 1' }).click();
  const schuif = spel.getByRole('slider', { name: /Jouw schatting/ });
  const status = spel.locator('div[role="status"]');

  for (let level = 1; level <= 3; level++) {
    await expect(spel.getByTestId('mg-forum-stand')).toContainText(`Level ${level} van 3`);
    for (let i = 0; i < 3; i++) {
      await expect(spel.getByTestId('mg-forum-stand')).toContainText(`Vraag ${i + 1} van 3`);
      const perInwoner = level === 3;
      await expect(spel.getByTestId('mg-forum-vraag')).toContainText(
        perInwoner ? 'elke inwoner' : 'Hoeveel geeft de gemeente',
      );
      const naam = (await spel.locator('.mg-fo-naam').textContent()) ?? '';
      const mln = echt.bedrag.get(naam) ?? 0;
      expect(mln, naam).toBeGreaterThan(0);
      const waarde = perInwoner ? (mln * 1e6) / echt.inwoners : mln;
      // met het toetsenbord: helemaal naar onder, dan stap voor stap omhoog
      await schuif.press('Home');
      const stappen = waardeNaarStap(waarde, perInwoner ? SCHAAL_EURO : SCHAAL_MLN);
      for (let s = 0; s < stappen; s++) await page.keyboard.press('ArrowRight');
      await expect(schuif).toHaveValue(String(stappen));
      await schuif.press('Enter');
      await expect(status).toContainText(perInwoner ? 'In totaal' : 'per inwoner');
      await expect(status).toContainText('★★★');
      await spel.getByTestId('mg-forum-volgende').click();
    }
    const einde = spel.getByTestId('mg-forum-einde');
    await expect(einde).toContainText(`Level ${level} gehaald: 9 van de 9 sterren`);
    await einde.getByRole('button').first().click();
  }
  const uitslag = spel.getByTestId('mg-forum-uitslag');
  await expect(uitslag).toContainText('27 van de 27 sterren');
  await expect(uitslag).toContainText('per inwoner');
  await uitslag.getByRole('button', { name: 'Naar de uitslag' }).click();
  await expect(page.getByTestId('minigame-klaar')).toContainText('27 van de 27');
});
