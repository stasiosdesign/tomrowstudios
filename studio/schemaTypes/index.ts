import {client} from './documents/client'
import {project} from './documents/project'
import {featureImage} from './objects/feature-image'
import {imageGallery} from './objects/image-gallery'
import {projectCredit} from './objects/project-credit'
import {textSection} from './objects/text-section'

export const schemaTypes = [project, client, projectCredit, featureImage, imageGallery, textSection]
