import type { CollectionConfig } from 'payload/types';
import blocksField from '../posts/blocks';
import fields from '../posts/fields';

const Posts: CollectionConfig = {
    slug: 'posts',
    auth: false,
    admin: {
        useAsTitle: 'title',
    },
    fields: [...fields, blocksField],
};

export default Posts;