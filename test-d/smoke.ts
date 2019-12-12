import {typesafe} from '../';

typesafe();
typesafe<null, null>({handler: () => {}, input: {}});
typesafe({handler: () => {}, input: {}});
