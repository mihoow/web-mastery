import type { Payload } from 'payload';
import type { Post as RawPost } from 'payload/generated-types';
import type { CodePenData, PageLayoutItem, Post, QAItem, QuestionsAndAnswersData, SectionItem, TextBlockData, YoutubeVideoData } from './type';
import type { AppLoadContext } from '@remix-run/node';

function normalizeSections(sections: RawPost['sections']): SectionItem[] {
    return sections.reduce<SectionItem[]>((acc, section) => {
        if (section.blockType === 'TextBlock') {
            const { content, contentHTML, ...otherProperties } = section;

            if (!contentHTML) {
                return acc;
            }

            if (section.contentHTML) {
                return [...acc, { ...otherProperties, content: contentHTML || '' } satisfies TextBlockData];
            }
        }

        if (section.blockType === 'YoutubeVideo') {
            const { videoId } = section;

            return [
                ...acc,
                {
                    ...section,
                    thumbnailUrl: `https://youtube.com/vi/${videoId}/0.jpg`,
                } satisfies YoutubeVideoData,
            ];
        }

        if (section.blockType === 'QuestionsAndAnswers') {
            const { items: rawItems } = section

            const items: QAItem[] = rawItems.map(({ questionHTML, shortQuestion, textAnswer, richTextAnswerHTML, codeAnswer }) => ({
                id: shortQuestion.toLowerCase().replaceAll(/\s+/g, '-'),
                question: questionHTML || shortQuestion,
                shortQuestion,
                textAnswer,
                richTextAnswer: richTextAnswerHTML,
                codeAnswer,
            }))

            return [...acc, {  ...section, items } satisfies QuestionsAndAnswersData];
        }

        if (section.blockType === 'CodePen') {
            return [...acc, { ...section, codePenUrl: process.env.CODEPEN_URL || '' } satisfies CodePenData];
        }

        return [...acc, section as unknown as SectionItem];
    }, []);
}

function extractPageLayout(sections: SectionItem[]): PageLayoutItem[] {
    return sections.map((section) => {
        const { sectionId, title, blockType } = section

        const item: PageLayoutItem = {
            id: sectionId,
            title
        }

        if (blockType === 'QuestionsAndAnswers') {
            const { items } = section

            item.subsections = items.map(({ id, shortQuestion }) => {
                return {
                    id,
                    title: shortQuestion
                }
            })
        }

        return item
    })
}

function normalizePost(rawData: RawPost): Post {
    const {
        title,
        createdAt,
        advancedTitling: { metaTitle, navTitle = title, tabTitle = navTitle } = {},
        stats: { totalViews, created, tags },
        sections: rawSections,
    } = rawData;

    const sections = normalizeSections(rawSections)

    return {
        ...rawData,
        advancedTitling: {
            metaTitle: metaTitle || title,
            navTitle: navTitle || title,
            tabTitle: tabTitle || navTitle || title,
        },
        stats: {
            totalViews,
            created: created || createdAt,
            tags: tags || [],
        },
        sections,
        layout: extractPageLayout(sections)
    };
}

export async function getPostBySlug(payload: Payload, slug: string) {
    const data = await payload.find({
        collection: 'posts',
        where: {
            pageSlug: {
                equals: slug,
            },
        },
    });

    const post = data.docs[0]

    if (!post) {
        return null
    }

    return normalizePost(post);
}


export async function updateViewsCount({ payload, user }: AppLoadContext, postId: string) {
    if (process.env.NODE_ENV !== 'production') {
        return
    }

    if (user?.email === 'm98.wieczorek@gmail.com') {
        return
    }

    const postsCollection = payload.db.collections['posts']

    if (!postsCollection) {
        return
    }

    await postsCollection.updateOne({ _id: postId }, { $inc: { 'stats.totalViews': 1 } })
}