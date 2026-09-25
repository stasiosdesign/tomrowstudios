import {client} from './documents/client'
import {homePage} from './documents/home-page'
import {project} from './documents/project'
import {featureImage} from './objects/feature-image'
import {heroSlide} from './objects/hero-slide'
import {homeCard} from './objects/home-card'
import {homeGallery} from './objects/home-gallery'
import {imageGallery} from './objects/image-gallery'
import {projectCredit} from './objects/project-credit'
import {textSection} from './objects/text-section'
import {pageTypes} from './pages'

export const schemaTypes = [
  homePage,
  ...pageTypes,
  project,
  client,
  heroSlide,
  homeGallery,
  homeCard,
  projectCredit,
  featureImage,
  imageGallery,
  textSection,
]
