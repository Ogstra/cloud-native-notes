import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
    const demoEmail = 'ogsdemo';
    const demoUsername = 'ogsdemo';
    const demoPassword = 'demo1234';

    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email: demoEmail },
                { username: demoUsername }
            ]
        }
    });

    let demoUserId: number;
    if (!existingUser) {
        const hashedPassword = await bcrypt.hash(demoPassword, 10);
        const user = await prisma.user.create({
            data: {
                email: demoEmail,
                username: demoUsername,
                password: hashedPassword,
            },
        });
        demoUserId = user.id;
        console.log('✅ Default demo user created: ogsdemo / demo1234');
    } else {
        demoUserId = existingUser.id;
        console.log('ℹ️ Demo user already exists');
    }

    const existingNotes = await prisma.note.findFirst({
        where: { userId: demoUserId },
        select: { id: true },
    });
    if (existingNotes) {
        console.log('ℹ️ Demo notes already exist');
        return;
    }

    const categoryNames = [
        'Coffee',
        'Shopping',
        'Recipes',
        'Work',
        'Personal',
        'Ideas'
    ];

    const categories = await Promise.all(
        categoryNames.map((name) =>
            prisma.category.upsert({
                where: { name_userId: { name, userId: demoUserId } },
                update: {},
                create: { name, userId: demoUserId },
            })
        )
    );

    const byName = Object.fromEntries(categories.map((c: { name: string; id: number }) => [c.name, c.id]));

    const notes = [
        {
            title: 'Espresso Journal',
            content: '<p>Trying a new single-origin espresso today.</p><p>Notes: juicy, blackberry, cocoa finish.</p>',
            isArchived: false,
            isDeleted: false,
            categories: ['Coffee'],
        },
        {
            title: 'Dial-in: 18g in / 36g out',
            content: '<p>Recipe:</p><p>18g in · 36g out · 28s · 93°C</p><p>Adjust grind finer if sour.</p>',
            isArchived: false,
            isDeleted: false,
            categories: ['Coffee', 'Ideas'],
        },
        {
            title: 'Grocery list',
            content: '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox" /><span></span></label><div><p>Milk</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox" /><span></span></label><div><p>Eggs</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox" /><span></span></label><div><p>Tomatoes</p></div></li><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked" /><span></span></label><div><p>Olive oil</p></div></li></ul>',
            isArchived: false,
            isDeleted: false,
            categories: ['Shopping'],
        },
        {
            title: 'Pasta alla vodka',
            content: '<p>Ingredients:</p><p>Tomato paste, vodka, cream, chili flakes, parmesan.</p><p>Finish with basil.</p>',
            isArchived: false,
            isDeleted: false,
            categories: ['Recipes'],
        },
        {
            title: 'Weekend brunch',
            content: '<p>Plan: pancakes, eggs benedict, fresh fruit.</p><p>Prep list: batter, hollandaise, berries, coffee.</p>',
            isArchived: true,
            isDeleted: false,
            categories: ['Personal', 'Recipes'],
        },
        {
            title: 'Project kickoff',
            content: '<p>Agenda: scope, milestones, risks, owners.</p><p>Questions: decision log, comms cadence.</p><p>Next: draft timeline.</p>',
            isArchived: true,
            isDeleted: false,
            categories: ['Work'],
        },
        {
            title: 'Coffee gear wishlist',
            content: '<p>58mm tamper, VST basket, distribution tool.</p>',
            isArchived: false,
            isDeleted: false,
            categories: ['Coffee', 'Ideas'],
        },
        {
            title: 'Trash: old reminder',
            content: '<p>Cancel dentist appointment.</p><p>Reschedule for next month.</p>',
            isArchived: false,
            isDeleted: true,
            categories: ['Personal'],
        },
        {
            title: 'Trash: shopping draft',
            content: '<p>Store run: cereal, yogurt, coffee filters.</p><p>Check discounts on oat milk.</p>',
            isArchived: false,
            isDeleted: true,
            categories: ['Shopping'],
        },
        {
            title: 'Meeting notes',
            content: '<p>Decisions: finalize UI, confirm timeline, assign QA.</p>',
            isArchived: false,
            isDeleted: false,
            categories: ['Work'],
        },
        {
            title: 'Ethiopia washed espresso',
            content: '<p>Floral aroma, peach, bergamot.</p><p>Grind slightly finer for sweetness.</p>',
            isArchived: false,
            isDeleted: false,
            categories: ['Coffee'],
        },
        {
            title: 'Iced latte ratios',
            content: '<p>1:2 espresso to milk, add ice last.</p>',
            isArchived: false,
            isDeleted: false,
            categories: ['Coffee'],
        },
        {
            title: 'Super list — pantry',
            content: '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox" /><span></span></label><div><p>Rice</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox" /><span></span></label><div><p>Beans</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox" /><span></span></label><div><p>Pasta</p></div></li></ul>',
            isArchived: false,
            isDeleted: false,
            categories: ['Shopping'],
        },
        {
            title: 'Recipe: Tomato soup',
            content: '<p>Roast tomatoes, blend with garlic and onion, finish with cream.</p>',
            isArchived: false,
            isDeleted: false,
            categories: ['Recipes'],
        },
        {
            title: 'Weekly goals',
            content: '<p>Ship label UI, fix drag edge case, write docs.</p>',
            isArchived: false,
            isDeleted: false,
            categories: ['Work', 'Ideas'],
        },
        {
            title: 'Ideas: espresso bar layout',
            content: '<p>Floating shelf, tamp station, cup rail.</p>',
            isArchived: false,
            isDeleted: false,
            categories: ['Ideas', 'Coffee'],
        },
        {
            title: 'Archive: summer menu',
            content: '<p>Cold brew, affogato, citrus spritz.</p><p>Consider adding tonic espresso.</p>',
            isArchived: true,
            isDeleted: false,
            categories: ['Coffee'],
        },
        {
            title: 'Archive: grocery pricing',
            content: '<p>Track weekly prices for staples.</p><p>Note seasonal swings for produce.</p><p>Compare two nearby stores.</p>',
            isArchived: true,
            isDeleted: false,
            categories: ['Shopping'],
        },
        {
            title: 'Trash: old recipe',
            content: '<p>Delete this draft recipe.</p><p>Too salty, needs retest.</p>',
            isArchived: false,
            isDeleted: true,
            categories: ['Recipes'],
        },
        {
            title: 'Trash: canceled task',
            content: '<p>Remove unused task list.</p><p>No longer needed after scope change.</p>',
            isArchived: false,
            isDeleted: true,
            categories: ['Work'],
        },
        {
            title: 'Pour over notes',
            content: '<p>15g coffee, 250g water, 2:45 total time.</p>',
            isArchived: false,
            isDeleted: false,
            categories: ['Coffee'],
        },
        {
            title: 'Quick lunch ideas',
            content: '<p>Caprese sandwich, avocado toast, miso soup.</p>',
            isArchived: false,
            isDeleted: false,
            categories: ['Personal', 'Recipes'],
        },
        {
            title: 'Recipe: Overnight oats',
            content: '<p>Oats, milk, chia, honey. Rest overnight.</p>',
            isArchived: false,
            isDeleted: false,
            categories: ['Recipes'],
        },
        {
            title: 'Weekly errands',
            content: '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox" /><span></span></label><div><p>Post office</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox" /><span></span></label><div><p>Pick up meds</p></div></li></ul>',
            isArchived: false,
            isDeleted: false,
            categories: ['Personal', 'Shopping'],
        },
        {
            title: 'Design backlog',
            content: '<p>Sidebar spacing, label popup, theme contrast.</p>',
            isArchived: false,
            isDeleted: false,
            categories: ['Work'],
        },
        {
            title: 'Recipe: Lemon pasta',
            content: '<p>Lemon zest, olive oil, garlic, parmesan.</p>',
            isArchived: false,
            isDeleted: false,
            categories: ['Recipes'],
        },
        {
            title: 'Coffee: grinder cleanup',
            content: '<p>Brush burrs, vacuum chute, wipe hopper.</p>',
            isArchived: false,
            isDeleted: false,
            categories: ['Coffee'],
        },
        {
            title: 'Archive: travel checklist',
            content: '<p>Passport, chargers, headphones, adapter.</p><p>Pack meds, sunglasses, water bottle.</p>',
            isArchived: true,
            isDeleted: false,
            categories: ['Personal'],
        },
        {
            title: 'Trash: old idea',
            content: '<p>Drop this feature experiment.</p><p>Didn\'t fit the UX direction.</p>',
            isArchived: false,
            isDeleted: true,
            categories: ['Ideas'],
        },
        {
            title: 'Shopping: weekend market',
            content: '<p>Berries, sourdough, fresh herbs.</p>',
            isArchived: false,
            isDeleted: false,
            categories: ['Shopping'],
        },
    ];

    const activeIndexes = notes
        .map((note, index) => ({ note, index }))
        .filter(({ note }) => !note.isArchived && !note.isDeleted)
        .map(({ index }) => index);

    const activePinnedCount = Math.max(1, Math.round(activeIndexes.length * 0.1));
    const pinnedIndexes = new Set(activeIndexes.slice(0, activePinnedCount));

    const colors = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink'];
    const transparentRate = 0.3;
    const rngSeed = notes.reduce((acc, note) => acc + note.title.length, 0);
    const random = (() => {
        let seed = rngSeed || 1;
        return () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    })();
    const extraPinnedNeeded = Math.max(0, activePinnedCount + 2 - pinnedIndexes.size);
    if (extraPinnedNeeded > 0) {
        const candidates = activeIndexes.filter((idx) => !pinnedIndexes.has(idx));
        const picks = candidates.slice(-extraPinnedNeeded);
        picks.forEach((idx) => pinnedIndexes.add(idx));
    }

    await prisma.note.createMany({
        data: notes.map((note, index) => ({
            title: note.title,
            content: note.content,
            isArchived: note.isArchived,
            isDeleted: note.isDeleted,
            isPinned: pinnedIndexes.has(index),
            position: index,
            color: random() < transparentRate
                ? 'transparent'
                : colors[Math.floor(random() * colors.length)],
            userId: demoUserId,
        })),
    });

    const createdNotes = await prisma.note.findMany({
        where: { userId: demoUserId },
        orderBy: { id: 'asc' },
        select: { id: true, title: true },
    });

    const noteIdByTitle = new Map(createdNotes.map((n: { title: string; id: number }) => [n.title, n.id]));

    await Promise.all(
        notes.flatMap((note) => {
            const noteId = noteIdByTitle.get(note.title);
            if (noteId === undefined || note.categories.length === 0) return [];
            return note.categories.map((categoryName) =>
                prisma.note.update({
                    where: { id: noteId },
                    data: {
                        categories: { connect: { id: byName[categoryName] } },
                    },
                })
            );
        })
    );

    console.log('✅ Demo notes created');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
