// Changes here require a server restart.
// To restart press CTRL + C in terminal and run `gridsome develop`

/*
    NOTE: We have to disable those two rules because Gridsome force us to modify nodes in a way ESlint is not happy
    about, this won't be needed if we'd be able to remove onCreateNode completely - erika, 2020-04-19
*/

/* eslint-disable no-param-reassign */
/* eslint-disable consistent-return */

const fs = require('fs');

// eslint-disable-next-line func-names
module.exports = function (api) {
    api.loadSource(({ addSchemaTypes, addCollection }) => {
        const typeSchema = fs.readFileSync('./types.graphql', 'utf-8');
        addSchemaTypes(typeSchema);

        /*
            NOTE: I'm not sure quite why this is needed. If we don't do that, Gridsome doesn't add all the sorting &
            filtering arguments. However, if we do this, it does.. How weird - erika, 2020-04-30
        */
        const chapterCollection = addCollection('Chapter');
        chapterCollection.addReference('sections', '[Section]');
    });

    /*
        TODO: Refactor and document what we are doing here better. What's the purpose of tempMap and tempMap2?

        The first one is the list of Section, it's a key-value where the key is the id of the chapter and the value is
        the chapter it's in

        The second one is the list of Chapter, same thing as the first one except the key is the name of the chapter and
        the value is the course that it's in.
    */
    const tempMap = {};
    const tempMap2 = {};
    let lastSection = {};
    api.onCreateNode((options) => {
        if (options.internal.typeName === 'Section') {
            // Format: {course-name}/{chapter-id}/{course-id}
            options.name = `${options.fileInfo.directory.substring(0, options.fileInfo.directory.indexOf('/') + 3)}/${options.fileInfo.name.substring(0, 2)}`;
            options.chapter = options.name.substring(0, options.name.indexOf('/') + 3);
            options.course = options.chapter.substring(0, options.chapter.indexOf('/'));

            if (tempMap[options.chapter] === undefined) {
                tempMap[options.chapter] = { sections: [], video: '' };
            }

            if (options.fileInfo.name === '00-video') {
                tempMap[options.chapter].video = options.id;

                /*
                    For videos we assume that if a previous chapter exist, the video for it exists as well,
                    there shouldn't be any cases where that isn't the case, erika - 2020-05-24
                */
                if (lastSection) {
                    if (lastSection.course === options.course) {
                        options.previous = `${lastSection.chapter}/00`;
                    }
                }
            } else {
                tempMap[options.chapter].sections.push(options.id);

                if (lastSection) {
                    if (lastSection.course === options.course) {
                        options.previous = lastSection.name;
                    }
                }

                lastSection = options;
            }


            return {
                ...options,
            };
        }

        if (options.internal.typeName === 'Chapter') {
            options.name = options.fileInfo.directory.substring(0, options.fileInfo.directory.indexOf('/') + 3);
            options.course = options.fileInfo.directory.substring(0, options.fileInfo.directory.indexOf('/'));

            const tempList = [];
            if (tempMap[options.name] !== undefined) {
                tempMap[options.name].sections.forEach((section) => tempList.push(section));
                options.sections = tempList;

                options.video = tempMap[options.name].video;
            }

            tempMap2[options.name] = options.course;

            return {
                ...options,
            };
        }

        if (options.internal.typeName === 'Course') {
            options.name = options.fileInfo.directory;
            options.engine_name = options.engine_name || null;

            const tempList = [];
            Object.entries(tempMap2).forEach(([key, value]) => {
                if (value === options.name) {
                    tempList.push(key);
                }
            });

            options.chapters = tempList;

            return {
                ...options,
            };
        }
    });
};
