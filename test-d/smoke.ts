import {typesafe, typesafeSync} from '../';

typesafe();
typesafeSync<null>(() => {}, {});
typesafeSync(() => {}, {});
